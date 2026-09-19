"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { SubscriberPreferenceSummary } from "@/lib/newsletter-preferences-types";

interface SubscriberPreferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriber: SubscriberPreferenceSummary | null;
}

export function SubscriberPreferenceDialog({
  open,
  onOpenChange,
  subscriber,
}: SubscriberPreferenceDialogProps) {
  if (!subscriber) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {subscriber.email}
            {!subscriber.active && <Badge variant="secondary">Inactive</Badge>}
            {subscriber.coldStart && <Badge variant="outline">Cold start</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground">Readers</div>
              <div className="text-2xl font-semibold">{subscriber.readerCount}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground">Interactions</div>
              <div className="text-2xl font-semibold">{subscriber.interactionCount}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground">Distinct stories</div>
              <div className="text-2xl font-semibold">{subscriber.distinctStories}</div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Linked readers</h3>
            <div className="space-y-2">
              {subscriber.readers.map((reader) => (
                <div key={reader.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-xs">{reader.id}</div>
                    <div className="text-xs text-muted-foreground">
                      last seen {new Date(reader.lastSeenAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {reader.interactions.length} recent interactions
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reader.interactions.slice(0, 5).map((interaction) => (
                      <Badge key={interaction.id} variant="outline" className="font-normal">
                        {interaction.type}: {interaction.storyTitle}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Top domains</h3>
              <div className="space-y-2">
                {subscriber.topDomains.length > 0 ? (
                  subscriber.topDomains.map((item) => (
                    <div key={item.value} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span>{item.value}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No domain preferences yet.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Top authors</h3>
              <div className="space-y-2">
                {subscriber.topAuthors.length > 0 ? (
                  subscriber.topAuthors.map((item) => (
                    <div key={item.value} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span>{item.value}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No author preferences yet.</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Current recommendation sample</h3>
            <div className="space-y-3">
              {subscriber.recommendationSample.map((story) => (
                <div key={story.id} className="rounded-md border p-3">
                  <div className="font-medium">{story.title}</div>
                  <div className="text-xs text-muted-foreground">
                    score {story.score}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {story.reasons.join(" and ")}
                  </div>
                </div>
              ))}
              {subscriber.recommendationSample.length === 0 && (
                <p className="text-muted-foreground">No recommendation sample yet.</p>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
