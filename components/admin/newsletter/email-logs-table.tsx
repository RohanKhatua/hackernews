"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import type { EmailLogRow } from "@/lib/newsletter-types";
import { cn } from "@/lib/utils";

export type EmailLogFilters = {
  status: string;
  kind: string;
  query: string;
};

const STATUS_STYLES: Record<string, string> = {
  delivered:
    "border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  sent: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  queued:
    "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  failed:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  bounced:
    "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  complained:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("capitalize", STATUS_STYLES[status])}>{status}</Badge>
  );
}

function relativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString();
}

export function EmailLogsTable({
  logs,
  total,
  page,
  totalPages,
  loading,
  filters,
  onFiltersChange,
  onPageChange,
  onRefresh,
}: {
  logs: EmailLogRow[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  filters: EmailLogFilters;
  onFiltersChange: (filters: EmailLogFilters) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">
            Email log
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {total.toLocaleString()} total
            </span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipient or subject..."
              value={filters.query}
              onChange={(event) =>
                onFiltersChange({ ...filters, query: event.target.value })
              }
              className="pl-9"
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="complained">Complained</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.kind}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, kind: value })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="top5">Top 5</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="confirmation">Confirmation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead className="hidden md:table-cell">Subject</TableHead>
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead className="w-[130px]">When</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No email logs match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.recipient}
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] truncate md:table-cell">
                      {log.subject}
                    </TableCell>
                    <TableCell className="capitalize">{log.kind}</TableCell>
                    <TableCell title={new Date(log.createdAt).toLocaleString()}>
                      {relativeTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] lg:table-cell">
                      {log.error ? (
                        <span
                          className="block truncate text-xs text-red-600 dark:text-red-400"
                          title={log.error}
                        >
                          {log.error}
                        </span>
                      ) : log.providerId ? (
                        <span
                          className="block truncate font-mono text-xs text-muted-foreground"
                          title={log.providerId}
                        >
                          {log.providerId}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}