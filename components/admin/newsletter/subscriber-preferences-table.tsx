"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SubscriberPreferenceSummary } from "@/lib/newsletter-preferences-types";

interface SubscriberPreferencesTableProps {
  preferences: SubscriberPreferenceSummary[];
  onSelect: (subscriber: SubscriberPreferenceSummary) => void;
}

export function SubscriberPreferencesTable({
  preferences,
  onSelect,
}: SubscriberPreferencesTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return preferences;
    return preferences.filter((subscriber) =>
      [subscriber.email, subscriber.name ?? "", ...subscriber.readerIds].some((value) =>
        value.toLowerCase().includes(q),
      ),
    );
  }, [preferences, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subscribers, names, or reader ids"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        />
        <Badge variant="secondary">{filtered.length} shown</Badge>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Subscriber</th>
              <th className="px-4 py-3">Readers</th>
              <th className="px-4 py-3">Signals</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((subscriber) => (
              <tr key={subscriber.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{subscriber.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {subscriber.name ?? "No name"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{subscriber.readerCount}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-muted-foreground">
                    {subscriber.interactionCount} interactions · {subscriber.distinctStories} stories
                  </div>
                  <div className="mt-1 text-xs">
                    {subscriber.coldStart ? "Cold start" : "Personalized"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={subscriber.active ? "default" : "secondary"}>
                      {subscriber.active ? "Active" : "Inactive"}
                    </Badge>
                    {subscriber.confirmedAt ? (
                      <Badge variant="outline">Confirmed</Badge>
                    ) : (
                      <Badge variant="secondary">Unconfirmed</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" onClick={() => onSelect(subscriber)}>
                    Inspect
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                  No subscribers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
