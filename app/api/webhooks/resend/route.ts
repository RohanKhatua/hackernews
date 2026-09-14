import { NextResponse } from "next/server";
import { verifyResendWebhook } from "@/lib/resend-webhook";
import {
  findEmailLogByProviderId,
  updateEmailLogStatus,
} from "@/lib/email/logging";
import { deactivateSubscriberByEmail } from "@/lib/db";

type ResendWebhookEvent = {
  type: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { message?: string };
  };
};

function firstRecipient(to: string[] | string | undefined): string | null {
  if (!to) return null;
  if (Array.isArray(to)) return to[0] ?? null;
  return to;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await request.text();
  const isValid = verifyResendWebhook({
    svixId: request.headers.get("svix-id"),
    svixTimestamp: request.headers.get("svix-timestamp"),
    svixSignature: request.headers.get("svix-signature"),
    payload,
    secret,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const emailId = event.data?.email_id;
    const recipient =
      firstRecipient(event.data?.to) ??
      (emailId
        ? (await findEmailLogByProviderId(emailId))?.recipient ?? null
        : null);

    switch (event.type) {
      case "email.delivered":
        if (emailId) {
          const log = await findEmailLogByProviderId(emailId);
          if (log) await updateEmailLogStatus(log.id, "delivered");
        }
        break;

      case "email.bounced":
      case "email.complained": {
        const status =
          event.type === "email.bounced" ? "bounced" : "complained";
        if (emailId) {
          const log = await findEmailLogByProviderId(emailId);
          if (log) {
            await updateEmailLogStatus(
              log.id,
              status,
              event.data?.bounce?.message,
            );
          }
        }
        if (recipient) {
          await deactivateSubscriberByEmail(recipient);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error handling Resend webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}