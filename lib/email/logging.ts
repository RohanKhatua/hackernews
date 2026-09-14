import { prisma } from "@/lib/db";

export type EmailKind = "top5" | "recommended" | "confirmation";

type ClaimInput = {
  subscriberId?: string | null;
  recipient: string;
  subject: string;
  kind: EmailKind;
  batchKey?: string | null;
};

/**
 * Returns the set of lowercased recipients that already have a successful send
 * for the given batch key. Used to make broadcasts idempotent across retries.
 */
export async function getSentRecipients(batchKey: string): Promise<Set<string>> {
  const logs = await prisma.emailLog.findMany({
    where: { batchKey, status: { in: ["sent", "delivered"] } },
    select: { recipient: true },
  });

  return new Set(logs.map((log) => log.recipient.toLowerCase()));
}

/**
 * Creates (or reuses) a log row per recipient before sending. Returns a map of
 * lowercased recipient -> log id so results can be attributed after sending.
 */
export async function claimEmails(entries: ClaimInput[]) {
  if (entries.length === 0) {
    return new Map<string, string>();
  }

  await prisma.emailLog.createMany({
    data: entries.map((entry) => ({
      subscriberId: entry.subscriberId ?? null,
      recipient: entry.recipient,
      subject: entry.subject,
      kind: entry.kind,
      batchKey: entry.batchKey ?? null,
    })),
    skipDuplicates: true,
  });

  const recipients = entries.map((entry) => entry.recipient);
  const logs = await prisma.emailLog.findMany({
    where: {
      batchKey: entries[0].batchKey ?? null,
      recipient: { in: recipients },
    },
    select: { id: true, recipient: true },
  });

  return new Map(logs.map((log) => [log.recipient.toLowerCase(), log.id]));
}

export async function markEmailsSent(
  updates: { id: string; providerId: string }[],
) {
  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((update) =>
      prisma.emailLog.update({
        where: { id: update.id },
        data: {
          status: "sent",
          providerId: update.providerId,
          error: null,
        },
      }),
    ),
  );
}

export async function markEmailsFailed(
  updates: { id: string; error: string }[],
) {
  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((update) =>
      prisma.emailLog.update({
        where: { id: update.id },
        data: { status: "failed", error: update.error },
      }),
    ),
  );
}

export async function recordSingleEmail(params: {
  subscriberId?: string | null;
  recipient: string;
  subject: string;
  kind: EmailKind;
  providerId?: string;
  error?: string;
}) {
  return prisma.emailLog.create({
    data: {
      subscriberId: params.subscriberId ?? null,
      recipient: params.recipient,
      subject: params.subject,
      kind: params.kind,
      status: params.error ? "failed" : "sent",
      providerId: params.providerId,
      error: params.error,
    },
  });
}

export async function findEmailLogByProviderId(providerId: string) {
  return prisma.emailLog.findFirst({
    where: { providerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateEmailLogStatus(
  id: string,
  status: string,
  error?: string,
) {
  return prisma.emailLog.update({
    where: { id },
    data: { status, error: error ?? null },
  });
}
