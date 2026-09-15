import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Mail } from "lucide-react";
import type { EmailStatsData } from "@/lib/newsletter-types";
import { cn } from "@/lib/utils";

function formatNumber(value: number) {
  return value.toLocaleString();
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "positive";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-3xl font-semibold tabular-nums leading-none">
              {value}
            </p>
          </div>
          <div
            className={cn(
              "rounded-full p-2",
              tone === "warning" &&
                "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
              tone === "positive" &&
                "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
              tone === "default" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ email }: { email: EmailStatsData }) {
  const delivered = email.byStatus.delivered ?? 0;
  const sent = email.byStatus.sent ?? 0;
  const bounced = email.byStatus.bounced ?? 0;
  const complained = email.byStatus.complained ?? 0;
  const failed = email.byStatus.failed ?? 0;
  const queued = email.byStatus.queued ?? 0;
  const undeliverable = bounced + complained + failed;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Emails sent"
        value={formatNumber(email.total)}
        icon={Mail}
        hint={
          <span>
            {formatNumber(email.last7d)} last 7 days ·{" "}
            {formatNumber(email.last24h)} in 24h ·{" "}
            {formatNumber(email.uniqueRecipients)} unique recipients
          </span>
        }
      />

      <StatCard
        label="Delivery rate"
        value={
          email.deliveryRate === null
            ? "—"
            : `${Math.round(email.deliveryRate * 100)}%`
        }
        icon={CheckCircle2}
        tone="positive"
        hint={
          <span>
            {formatNumber(delivered)} delivered · {formatNumber(sent)} accepted
          </span>
        }
      />

      <StatCard
        label="Undeliverable"
        value={formatNumber(undeliverable)}
        icon={AlertTriangle}
        tone={undeliverable > 0 ? "warning" : "default"}
        hint={
          <span>
            {bounced} bounced · {complained} complained · {failed} failed
          </span>
        }
      />

      <StatCard
        label="In flight"
        value={formatNumber(queued)}
        icon={Clock}
        hint="Accepted but no delivery confirmation yet"
      />
    </div>
  );
}

export function EmailTypeBreakdown({ email }: { email: EmailStatsData }) {
  const types = [
    { key: "top5", label: "Top 5" },
    { key: "recommended", label: "Recommended" },
    { key: "confirmation", label: "Confirmation" },
  ];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          By type
        </span>
        {types.map((type) => (
          <Badge key={type.key} variant="secondary" className="font-normal">
            {type.label}:{" "}
            <span className="ml-1 font-semibold tabular-nums">
              {formatNumber(email.byKind[type.key] ?? 0)}
            </span>
          </Badge>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {email.lastSendAt
            ? `Last send ${new Date(email.lastSendAt).toLocaleString()}`
            : "No sends yet"}
        </span>
      </CardContent>
    </Card>
  );
}