import { prisma } from "@/lib/db";

export type EmailKind = "top5" | "recommended" | "confirmation";

export type EmailLogFilters = {
  status?: string;
  kind?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type EmailActivityPoint = {
  day: string;
  sent: number;
  failed: number;
  undeliverable: number;
};

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

export type EmailStats = {
  total: number;
  byStatus: Record<string, number>;
  byKind: Record<string, number>;
  uniqueRecipients: number;
  last24h: number;
  last7d: number;
  lastSendAt: Date | null;
  deliveryRate: number | null;
  openIssues: number;
  daily: EmailActivityPoint[];
};

const ZERO_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "complained",
];

/**
 * Aggregates deliverability metrics for the admin dashboard.
 */
export async function getEmailStats(days = 14): Promise<EmailStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, byStatusRows, byKindRows, uniqueRecipientsRows, last24h, last7d, lastLog, dailyRows] =
    await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.emailLog.groupBy({ by: ["kind"], _count: { _all: true } }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(DISTINCT recipient) AS count FROM "EmailLog"
      `,
      prisma.emailLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.emailLog.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.emailLog.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.$queryRaw<
        { day: Date; sent: bigint; failed: bigint; undeliverable: bigint }[]
      >`
        SELECT
          date_trunc('day', "createdAt") AS day,
          count(*) FILTER (WHERE status IN ('sent', 'delivered')) AS sent,
          count(*) FILTER (WHERE status = 'failed') AS failed,
          count(*) FILTER (WHERE status IN ('bounced', 'complained')) AS undeliverable
        FROM "EmailLog"
        WHERE "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

  const uniqueRecipients = Number(uniqueRecipientsRows[0]?.count ?? 0);

  const byStatus: Record<string, number> = Object.fromEntries(
    ZERO_STATUSES.map((status) => [status, 0]),
  );
  for (const row of byStatusRows) {
    byStatus[row.status] = row._count._all;
  }

  const byKind: Record<string, number> = {
    top5: 0,
    recommended: 0,
    confirmation: 0,
  };
  for (const row of byKindRows) {
    byKind[row.kind] = row._count._all;
  }

  const delivered = byStatus.delivered ?? 0;
  const accepted = (byStatus.sent ?? 0) + delivered;
  const undeliverable =
    (byStatus.bounced ?? 0) + (byStatus.complained ?? 0) + (byStatus.failed ?? 0);

  const dailyMap = new Map<string, EmailActivityPoint>();
  for (const row of dailyRows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    dailyMap.set(key, {
      day: key,
      sent: Number(row.sent),
      failed: Number(row.failed),
      undeliverable: Number(row.undeliverable),
    });
  }

  const daily: EmailActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    daily.push(
      dailyMap.get(date) ?? { day: date, sent: 0, failed: 0, undeliverable: 0 },
    );
  }

  return {
    total,
    byStatus,
    byKind,
    uniqueRecipients,
    last24h,
    last7d,
    lastSendAt: lastLog?.createdAt ?? null,
    deliveryRate: accepted + undeliverable > 0 ? delivered / (accepted + undeliverable) : null,
    openIssues: undeliverable + (byStatus.queued ?? 0),
    daily,
  };
}

/**
 * Paginated, filterable audit trail of every email attempt.
 */
export async function getEmailLogs(filters: EmailLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));

  const where = {
    ...(filters.status && filters.status !== "all"
      ? { status: filters.status }
      : {}),
    ...(filters.kind && filters.kind !== "all" ? { kind: filters.kind } : {}),
    ...(filters.query
      ? {
          OR: [
            { recipient: { contains: filters.query, mode: "insensitive" as const } },
            { subject: { contains: filters.query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type EmailLogRecord = Awaited<ReturnType<typeof getEmailLogs>>["logs"][number];
