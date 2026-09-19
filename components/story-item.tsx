"use client";

import Link from "next/link";
import { ExternalLink, Heart, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StoryItemProps {
  /** Numeric HN item id; 0 for articles from other sources. */
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants: number;
  /** Short excerpt of the linked article, when one is available. */
  excerpt?: string;
  /** Internal permalink (e.g. /story/[slug]). Defaults to /item/[id]. */
  href?: string;
  index?: number;
  /** Called after a dismiss is recorded, so lists can drop the row. */
  onDismiss?: (storyId: number) => void;
}

function safeDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function StoryItem({
  id,
  title,
  url,
  score,
  by,
  time,
  descendants,
  excerpt,
  href,
  index,
  onDismiss,
}: StoryItemProps) {
  const [liked, setLiked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const domain = safeDomain(url);
  const formattedTime = formatDistanceToNow(new Date(time * 1000), {
    addSuffix: true,
  });
  const story = { id, title, url, score, by, time, descendants };
  const internalPath = href ?? `/item/${id}`;
  // Non-HN articles have no numeric HN id, so personalization is skipped.
  const canInteract = id > 0;

  // Identity is carried by the httpOnly reader cookie, not the payload.
  const recordInteraction = async (type: "read" | "like" | "dismiss") => {
    if (!canInteract) return;
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ storyId: id, type, story }),
      });
    } catch (error) {
      console.error("Error recording interaction:", error);
    }
  };

  const likeStory = async () => {
    if (isLiking || liked) return;

    try {
      setIsLiking(true);
      await recordInteraction("like");
      setLiked(true);
    } finally {
      setIsLiking(false);
    }
  };

  const dismissStory = async () => {
    if (isDismissing || dismissed) return;

    try {
      setIsDismissing(true);
      await recordInteraction("dismiss");
      setDismissed(true);
      onDismiss?.(id);
    } finally {
      setIsDismissing(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="flex">
        {index !== undefined && (
          <div className="mr-2 flex-shrink-0">
            <span className="text-muted-foreground text-base w-5 sm:w-6 text-right inline-block">
              {index}.
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={url || internalPath}
              className="text-foreground font-medium text-base sm:text-lg break-words hover:text-primary"
              target={url ? "_blank" : undefined}
              rel={url ? "noopener noreferrer" : undefined}
              onClick={() => recordInteraction("read")}
            >
              {title}
            </Link>
            {url && (
              <Link
                href={url}
                className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordInteraction("read")}
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {domain}
                </span>
              </Link>
            )}
          </div>
          {excerpt && (
            <p className="mt-1 text-sm text-muted-foreground break-words">
              {excerpt}
            </p>
          )}
          <div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center">
            <span>{score} points</span>
            <span className="mx-1">•</span>
            <Link href={`/user/${by}`} className="hover:text-primary">
              {by}
            </Link>
            <span className="mx-1">•</span>
            <span>{formattedTime}</span>
            <span className="mx-1">•</span>
            <Link href={internalPath} className="hover:text-primary">
              {descendants} {descendants === 1 ? "comment" : "comments"}
            </Link>
            {canInteract && (
              <>
                <span className="mx-1">•</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLiking || liked}
                  onClick={likeStory}
                  className="h-6 px-1 text-muted-foreground hover:text-primary"
                >
                  <Heart
                    className="h-3.5 w-3.5"
                    fill={liked ? "currentColor" : "none"}
                  />
                  <span className="sr-only">Like story</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDismissing}
                  onClick={dismissStory}
                  className="h-6 px-1 text-muted-foreground hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Show fewer stories like this</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
