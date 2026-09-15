"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { StatsCards, EmailTypeBreakdown } from "@/components/admin/newsletter/stats-cards";
import { EmailActivityChart } from "@/components/admin/newsletter/email-activity-chart";
import { SendControls } from "@/components/admin/newsletter/send-controls";
import {
  EmailLogsTable,
  type EmailLogFilters,
} from "@/components/admin/newsletter/email-logs-table";
import { SubscribersTable } from "@/components/admin/newsletter/subscribers-table";
import type { SendResult } from "@/components/admin/newsletter/types";
import type {
  EmailLogRow,
  EmailStatsData,
  EmailLogsResponse,
  NewsletterStatsResponse,
  SubscriberRow,
} from "@/lib/newsletter-types";

type SendAction = "top5" | "top5-test" | "recommended" | "recommended-test";

const PAGE_SIZE = 25;
const DEFAULT_FILTERS: EmailLogFilters = { status: "all", kind: "all", query: "" };

export default function AdminNewsletterPage() {
  const { data: session } = useSession();

  const [stats, setStats] = useState<EmailStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(true);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const [logs, setLogs] = useState<EmailLogRow[]>([]);
  const [logsMeta, setLogsMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [logsLoading, setLogsLoading] = useState(true);
  const [filters, setFilters] = useState<EmailLogFilters>(DEFAULT_FILTERS);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);

  const [sending, setSending] = useState<SendAction | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/admin/newsletter/stats");
      const data: NewsletterStatsResponse = await response.json();
      if (data.success) {
        setStats(data.email);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchSubscribers = useCallback(async () => {
    setSubscribersLoading(true);
    setSubscribersError(null);
    try {
      const response = await fetch("/api/admin/newsletter/subscribers");
      if (!response.ok) {
        throw new Error(`Failed to fetch subscribers: ${response.statusText}`);
      }
      const data = await response.json();
      setSubscribers(data.subscribers || []);
    } catch (error) {
      setSubscribersError(
        error instanceof Error ? error.message : "Failed to load subscribers",
      );
    } finally {
      setSubscribersLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(
    async (pageToLoad: number, activeFilters: EmailLogFilters) => {
      setLogsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageToLoad),
          pageSize: String(PAGE_SIZE),
        });
        if (activeFilters.status !== "all") params.set("status", activeFilters.status);
        if (activeFilters.kind !== "all") params.set("kind", activeFilters.kind);
        if (activeFilters.query.trim()) params.set("query", activeFilters.query.trim());

        const response = await fetch(
          `/api/admin/newsletter/logs?${params.toString()}`,
        );
        const data: EmailLogsResponse = await response.json();
        if (data.success) {
          setLogs(data.logs);
          setLogsMeta({
            total: data.total,
            page: data.page,
            totalPages: data.totalPages,
          });
        }
      } catch (error) {
        console.error("Error fetching email logs:", error);
      } finally {
        setLogsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchStats();
    fetchSubscribers();
  }, [fetchStats, fetchSubscribers]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.query), 300);
    return () => clearTimeout(timer);
  }, [filters.query]);

  useEffect(() => {
    fetchLogs(page, {
      status: filters.status,
      kind: filters.kind,
      query: debouncedQuery,
    });
  }, [page, filters.status, filters.kind, debouncedQuery, fetchLogs]);

  const handleFiltersChange = (next: EmailLogFilters) => {
    setFilters(next);
    setPage(1);
  };

  const toggleSubscriberStatus = async (id: string, currentStatus: boolean) => {
    try {
      setStatusUpdating(id);
      const response = await fetch("/api/admin/newsletter/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      setSubscribers((prev) =>
        prev.map((subscriber) =>
          subscriber.id === id
            ? { ...subscriber, active: !currentStatus }
            : subscriber,
        ),
      );
      toast.success(
        `Subscriber ${currentStatus ? "disabled" : "enabled"} successfully`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update subscriber status",
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleSend = async (action: SendAction) => {
    setSending(action);
    setSendResult(null);

    try {
      const email = session?.user?.email;
      let url = "/api/send-newsletter";

      if (action === "top5-test") {
        if (!email) throw new Error("Admin user email not found.");
        url = `/api/send-newsletter?test=true&email=${encodeURIComponent(email)}`;
      } else if (action === "recommended") {
        url = "/api/send-newsletter?recommended=true";
      } else if (action === "recommended-test") {
        if (!email) throw new Error("Admin user email not found.");
        url = `/api/send-newsletter?recommended=true&test=true&email=${encodeURIComponent(
          email,
        )}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setSendResult({ ...data, at: Date.now() });

      if (data.success) {
        toast.success(data.message || "Newsletter sent");
        await Promise.all([fetchStats(), fetchLogs(page, filters)]);
      } else {
        toast.error(data.message || "Failed to send newsletter");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSendResult({ success: false, message, at: Date.now() });
      toast.error(message);
    } finally {
      setSending(null);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchStats(),
      fetchSubscribers(),
      fetchLogs(page, filters),
    ]);
    toast.success("Dashboard refreshed");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Newsletter dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Delivery metrics, send history, and subscriber management.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh all
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Email log</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {statsLoading || !stats ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[120px] w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <StatsCards email={stats} />
              <EmailTypeBreakdown email={stats} />
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <EmailActivityChart data={stats.daily} />
                </div>
                <SendControls
                  hasAdminEmail={Boolean(session?.user?.email)}
                  onSend={handleSend}
                  sending={sending}
                  result={sendResult}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <EmailLogsTable
            logs={logs}
            total={logsMeta.total}
            page={logsMeta.page}
            totalPages={logsMeta.totalPages}
            loading={logsLoading}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onPageChange={setPage}
            onRefresh={() => fetchLogs(page, filters)}
          />
        </TabsContent>

        <TabsContent value="subscribers">
          <SubscribersTable
            subscribers={subscribers}
            loading={subscribersLoading}
            error={subscribersError}
            statusUpdating={statusUpdating}
            onToggle={toggleSubscriberStatus}
            onRefresh={fetchSubscribers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}