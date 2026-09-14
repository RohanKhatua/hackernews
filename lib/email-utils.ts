"use server";

import { render } from "@react-email/components";
import NewsletterEmail from "@/react-emails/emails/NewsletterEmail";
import ConfirmSubscriptionEmail from "@/react-emails/emails/ConfirmSubscriptionEmail";
import { getAllActiveSubscribers, getSubscriberByEmail } from "./db";
import { getRecommendedStoriesForEmail } from "@/lib/recommendations";
import { createUnsubscribeToken } from "@/lib/tokens";
import { getEmailProvider, EMAIL_BATCH_SIZE, type EmailMessage } from "@/lib/email/provider";
import {
  claimEmails,
  markEmailsFailed,
  markEmailsSent,
  recordSingleEmail,
  getSentRecipients,
  type EmailKind,
} from "@/lib/email/logging";
import type { HackerNewsStory } from "@/lib/hn";
import type { Subscriber } from "@prisma/client";

type Recipient = Pick<Subscriber, "id" | "email" | "name">;

const RENDER_CONCURRENCY = 10;

function getFromAddress() {
  return process.env.FROM_EMAIL || "newsletter@yourdomain.com";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

function unsubscribeUrl(subscriberId: string) {
  return `${getAppUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(
    createUnsubscribeToken(subscriberId),
  )}`;
}

function listUnsubscribeHeaders(subscriberId: string): Record<string, string> {
  const url = unsubscribeUrl(subscriberId);
  return {
    "List-Unsubscribe": `<${url}>, <mailto:${getFromAddress()}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function personalize(html: string, name: string, unsubscribe: string) {
  return html
    .replace("{{unsubscribe_link}}", unsubscribe)
    .replace("{{name}}", name);
}

function dateKey() {
  return new Date().toISOString().slice(0, 10);
}

function longDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shortDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function broadcastSummary(result: {
  sent: number;
  failed: number;
  skipped: number;
}) {
  const parts = [`Email sent to ${result.sent} subscribers`];
  if (result.failed) parts.push(`${result.failed} failed`);
  if (result.skipped) parts.push(`${result.skipped} already sent`);
  return parts.join(", ");
}

function toEmailStories(stories: HackerNewsStory[]) {
  return stories.map((story) => ({
    ...story,
    score: story.score || 0,
    by: story.by || "unknown",
    descendants: story.descendants || 0,
  }));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function formatNewsletter(stories: HackerNewsStory[]) {
  const html = await render(
    NewsletterEmail({ stories: toEmailStories(stories), date: longDate(), appUrl: getAppUrl() }),
  );
  return html;
}

export async function formatRecommendedNewsletter(stories: HackerNewsStory[]) {
  const date = longDate();
  const html = await render(
    NewsletterEmail({
      stories: toEmailStories(stories),
      date,
      appUrl: getAppUrl(),
      title: "Recommended",
      intro:
        "Here are today's stories ranked from your reads, likes, authors, domains, and story topics:",
      preview: `Hacker News recommendations • ${date}`,
    }),
  );
  return html;
}

async function formatConfirmationEmail(name: string | null, confirmUrl: string) {
  return render(ConfirmSubscriptionEmail({ name: name || undefined, confirmUrl }));
}

/**
 * Broadcasts an email to a list of recipients, batching provider requests and
 * recording a log per recipient so retries are idempotent.
 */
async function broadcast({
  kind,
  subject,
  recipients,
  buildHtml,
  batchKey,
}: {
  kind: EmailKind;
  subject: string;
  recipients: Recipient[];
  buildHtml: (subscriber: Recipient) => Promise<string>;
  batchKey?: string;
}) {
  const alreadySent = batchKey
    ? await getSentRecipients(batchKey)
    : new Set<string>();
  const pending = recipients.filter(
    (recipient) => !alreadySent.has(recipient.email.toLowerCase()),
  );

  let sent = 0;
  let failed = 0;
  const skipped = recipients.length - pending.length;

  for (let i = 0; i < pending.length; i += EMAIL_BATCH_SIZE) {
    const chunk = pending.slice(i, i + EMAIL_BATCH_SIZE);

    const logIds = await claimEmails(
      chunk.map((subscriber) => ({
        subscriberId: subscriber.id,
        recipient: subscriber.email,
        subject,
        kind,
        batchKey: batchKey ?? null,
      })),
    );

    const rendered = await mapWithConcurrency(
      chunk,
      RENDER_CONCURRENCY,
      async (subscriber) => {
        try {
          const html = await buildHtml(subscriber);
          const message: EmailMessage = {
            from: getFromAddress(),
            to: subscriber.email,
            subject,
            html: personalize(
              html,
              subscriber.name || "there",
              unsubscribeUrl(subscriber.id),
            ),
            headers: listUnsubscribeHeaders(subscriber.id),
          };
          return { subscriber, message };
        } catch (error) {
          return {
            subscriber,
            message: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    );

    const sendable = rendered.filter(
      (item): item is { subscriber: Recipient; message: EmailMessage } =>
        item.message !== null,
    );
    const renderFailures = rendered.filter((item) => item.message === null);

    if (renderFailures.length > 0) {
      await markEmailsFailed(
        renderFailures.flatMap((item) => {
          const logId = logIds.get(item.subscriber.email.toLowerCase());
          return logId
            ? [{ id: logId, error: item.error || "Failed to render email" }]
            : [];
        }),
      );
      failed += renderFailures.length;
    }

    if (sendable.length === 0) {
      continue;
    }

    try {
      const results = await getEmailProvider().sendBatch(
        sendable.map((item) => item.message),
      );

      const updates = sendable.flatMap((item, index) => {
        const logId = logIds.get(item.subscriber.email.toLowerCase());
        const providerId = results[index]?.id;
        return logId && providerId ? [{ id: logId, providerId }] : [];
      });
      await markEmailsSent(updates);
      sent += updates.length;
      failed += sendable.length - updates.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markEmailsFailed(
        sendable.flatMap((item) => {
          const logId = logIds.get(item.subscriber.email.toLowerCase());
          return logId ? [{ id: logId, error: message }] : [];
        }),
      );
      failed += sendable.length;
    }
  }

  return { sent, failed, skipped };
}

async function sendTestEmail(
  recipient: string,
  subject: string,
  htmlContent: string,
  kind: EmailKind,
) {
  const subscriber = await getSubscriberByEmail(recipient);
  const url = subscriber ? unsubscribeUrl(subscriber.id) : getAppUrl();
  const html = personalize(htmlContent, "there", url);

  try {
    const { id } = await getEmailProvider().send({
      from: getFromAddress(),
      to: recipient,
      subject,
      html,
      ...(subscriber ? { headers: listUnsubscribeHeaders(subscriber.id) } : {}),
    });

    await recordSingleEmail({
      subscriberId: subscriber?.id ?? null,
      recipient,
      subject,
      kind,
      providerId: id,
    });

    return { success: true as const, message: `Email sent to ${recipient}` };
  } catch (error) {
    await recordSingleEmail({
      recipient,
      subject,
      kind,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function sendEmail(
  subject: string,
  htmlContent: string,
  recipient?: string,
  kind: EmailKind = "top5",
) {
  try {
    if (recipient) {
      return await sendTestEmail(recipient, subject, htmlContent, kind);
    }

    const subscribers = await getAllActiveSubscribers();
    if (subscribers.length === 0) {
      return { success: false, message: "No subscribers found" };
    }

    const result = await broadcast({
      kind,
      subject,
      recipients: subscribers,
      buildHtml: async () => htmlContent,
      batchKey: `${kind}:${dateKey()}`,
    });

    return {
      success: true,
      message: broadcastSummary(result),
    };
  } catch (error) {
    console.error("Error sending email: ", error);
    throw error;
  }
}

export async function sendRecommendedEmail(recipient?: string) {
  try {
    const subject = `Hacker News Recommended - ${shortDate()}`;

    if (recipient) {
      const stories = await getRecommendedStoriesForEmail(recipient, 5);
      const htmlContent = await formatRecommendedNewsletter(stories);
      return await sendTestEmail(
        recipient,
        subject,
        htmlContent,
        "recommended",
      );
    }

    const subscribers = await getAllActiveSubscribers();
    if (subscribers.length === 0) {
      return { success: false, message: "No subscribers found" };
    }

    const result = await broadcast({
      kind: "recommended",
      subject,
      recipients: subscribers,
      batchKey: `recommended:${dateKey()}`,
      buildHtml: async (subscriber) => {
        const stories = await getRecommendedStoriesForEmail(
          subscriber.email,
          5,
        );
        return formatRecommendedNewsletter(stories);
      },
    });

    return {
      success: true,
      message: broadcastSummary(result),
    };
  } catch (error) {
    console.error("Error sending recommended email: ", error);
    throw error;
  }
}

export async function sendConfirmationEmail(
  email: string,
  name: string | null,
  confirmationToken: string,
) {
  const confirmUrl = `${getAppUrl()}/api/newsletter/confirm?token=${encodeURIComponent(
    confirmationToken,
  )}`;
  const html = await formatConfirmationEmail(name, confirmUrl);
  const subject = "Confirm your Hacker News newsletter subscription";

  const { id } = await getEmailProvider().send({
    from: getFromAddress(),
    to: email,
    subject,
    html,
  });

  await recordSingleEmail({
    recipient: email,
    subject,
    kind: "confirmation",
    providerId: id,
  });

  return { success: true };
}
