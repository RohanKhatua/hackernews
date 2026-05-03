"use client";

import Link from "next/link";
import { ExternalLink, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getReaderId } from "@/lib/reader-id";

interface StoryItemProps {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants: number;
  index?: number;
}

export function StoryItem({
  id,
  title,
  url,
  score,
  by,
  time,
  descendants,
  index,
}: StoryItemProps) {
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const domain = url ? new URL(url).hostname.replace(/^www\./, "") : null;
  const formattedTime = formatDistanceToNow(new Date(time * 1000), {
    addSuffix: true,
  });
  const story = { id, title, url, score, by, time, descendants };

  const recordInteraction = async (type: "read" | "like") => {
    const readerId = getReaderId();
    if (!readerId) return;

    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ readerId, storyId: id, type, story }),
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
              href={url || `/item/${id}`}
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
          <div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center">
            <span>{score} points</span>
            <span className="mx-1">•</span>
            <Link href={`/user/${by}`} className="hover:text-primary">
              {by}
            </Link>
            <span className="mx-1">•</span>
            <span>{formattedTime}</span>
            <span className="mx-1">•</span>
            <Link href={`/item/${id}`} className="hover:text-primary">
              {descendants} {descendants === 1 ? "comment" : "comments"}
            </Link>
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
          </div>
        </div>
      </div>
    </div>
  );
}
