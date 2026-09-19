import Link from "next/link";
import type { TopicLink } from "@/lib/data";

/**
 * Keyword chips linking to /topics/[slug] landing pages. Rendering these on
 * story pages both helps readers and builds the internal link graph search
 * engines use to discover topic pages.
 */
export function KeywordChips({
  keywords,
  className = "",
}: {
  keywords: TopicLink[];
  className?: string;
}) {
  if (keywords.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {keywords.map((keyword) => (
        <Link
          key={keyword.slug}
          href={`/topics/${keyword.slug}`}
          className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          #{keyword.term}
        </Link>
      ))}
    </div>
  );
}
