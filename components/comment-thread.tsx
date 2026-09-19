"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CommentNode } from "@/lib/comments";

interface CommentThreadProps {
  comments: CommentNode[];
  level?: number;
}

/**
 * Renders a pre-fetched HN comment tree. Unlike the previous client-fetching
 * Comment component, the markup (and text) is part of the server HTML; this
 * component only owns the collapse/expand interaction.
 */
export function CommentThread({ comments, level = 0 }: CommentThreadProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 640);
  }, []);

  if (comments.length === 0) return null;

  return (
    <>
      {comments.map((comment) => (
        <CommentNodeView
          key={comment.id}
          comment={comment}
          level={level}
          isDesktop={isDesktop}
        />
      ))}
    </>
  );
}

function CommentNodeView({
  comment,
  level,
  isDesktop,
}: {
  comment: CommentNode;
  level: number;
  isDesktop: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  const formattedTime = formatDistanceToNow(new Date((comment.time || 0) * 1000), {
    addSuffix: true,
  });

  // Limit nesting on mobile to prevent horizontal overflow.
  const shouldNest = level < 6 || isDesktop;
  const nestingClass = shouldNest
    ? `pl-2 sm:pl-4 border-l border-border/40 ${
        level > 0 ? "ml-2 sm:ml-4 mt-4" : "mt-6"
      }`
    : "mt-4 pt-2 border-t border-border/40";

  return (
    <div className={nestingClass}>
      <div className="flex items-center gap-2 text-sm text-foreground mb-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse comment" : "Expand comment"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <Link
          href={`/user/${comment.by || "unknown"}`}
          className="font-medium hover:text-primary"
        >
          {comment.by || "unknown"}
        </Link>
        <span>{formattedTime}</span>
      </div>

      {expanded && (
        <>
          <div
            className="text-base mt-1 pl-5 max-w-none prose-p:my-1 prose-a:text-primary break-words overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: comment.text || "" }}
          />

          {comment.kids.length > 0 && (
            <CommentThread comments={comment.kids} level={level + 1} />
          )}
        </>
      )}
    </div>
  );
}
