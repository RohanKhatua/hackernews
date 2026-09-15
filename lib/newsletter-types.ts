export type EmailActivityPointData = {
  day: string;
  sent: number;
  failed: number;
  undeliverable: number;
};

export type EmailStatsData = {
  total: number;
  byStatus: Record<string, number>;
  byKind: Record<string, number>;
  uniqueRecipients: number;
  last24h: number;
  last7d: number;
  lastSendAt: string | null;
  deliveryRate: number | null;
  openIssues: number;
  daily: EmailActivityPointData[];
};

export type NewsletterStatsResponse = {
  success: boolean;
  email: EmailStatsData;
};

export type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  active: boolean;
  confirmedAt: string | null;
};

export type EmailLogRow = {
  id: string;
  subscriberId: string | null;
  recipient: string;
  subject: string;
  kind: string;
  status: string;
  batchKey: string | null;
  providerId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailLogsResponse = {
  success: boolean;
  logs: EmailLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
