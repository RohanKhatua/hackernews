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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { RefreshCw } from "lucide-react";
import type { SubscriberRow } from "@/lib/newsletter-types";
import { cn } from "@/lib/utils";

export function SubscribersTable({
  subscribers,
  loading,
  error,
  statusUpdating,
  onToggle,
  onRefresh,
}: {
  subscribers: SubscriberRow[];
  loading: boolean;
  error: string | null;
  statusUpdating: string | null;
  onToggle: (id: string, currentStatus: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Subscribers
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {subscribers.length.toLocaleString()} total
          </span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead className="text-center">Opt-in</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="mx-auto h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="mx-auto h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-5 w-10" /></TableCell>
                  </TableRow>
                ))
              ) : subscribers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No subscribers yet.
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((subscriber) => (
                  <TableRow
                    key={subscriber.id}
                    className={!subscriber.active ? "opacity-60" : ""}
                  >
                    <TableCell className="font-medium">
                      {subscriber.email}
                    </TableCell>
                    <TableCell>{subscriber.name || "-"}</TableCell>
                    <TableCell>
                      {new Date(subscriber.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {subscriber.confirmedAt ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                        >
                          Confirmed
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          subscriber.active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                        )}
                      >
                        {subscriber.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Switch
                          checked={subscriber.active}
                          disabled={statusUpdating === subscriber.id}
                          onCheckedChange={() =>
                            onToggle(subscriber.id, subscriber.active)
                          }
                          aria-label={`Toggle ${
                            subscriber.active ? "disable" : "enable"
                          }`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}