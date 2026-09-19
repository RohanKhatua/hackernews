"use client";

import { useState } from "react";
import { StoryItem } from "@/components/story-item";
import { feedItemPath } from "@/lib/paths";
import type { FeedItem } from "@/lib/data";

/**
 * Client wrapper that owns per-row dismiss state for a server-rendered feed.
 * The items themselves are fetched and rendered on the server, so their content
 * is in the initial HTML; only the like/dismiss interactions are client-side.
 */
export function FeedList({
  items,
  startIndex = 1,
}: {
  items: FeedItem[];
  startIndex?: number;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = (item: FeedItem) => {
    setDismissed((prev) => new Set(prev).add(item.slug));
  };

  return (
    <div className="space-y-0">
      {items
        .filter((item) => !dismissed.has(item.slug))
        .map((item, index) => (
          <StoryItem
            key={`${item.sourceId}:${item.slug}`}
            id={item.id}
            title={item.title}
            url={item.url}
            score={item.score}
            by={item.author}
            time={item.time}
            descendants={item.descendants}
            excerpt={item.excerpt}
            href={feedItemPath(item)}
            index={startIndex + index}
            onDismiss={() => handleDismiss(item)}
          />
        ))}
    </div>
  );
}
