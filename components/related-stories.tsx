import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { feedItemPath, itemDomain } from "@/lib/paths";
import type { FeedItem } from "@/lib/data";

/**
 * "Related stories" block: internal links chosen by shared keywords. Rendered
 * on the server so crawlers see the link graph in the HTML.
 */
export function RelatedStories({
  items,
  heading = "Related stories",
}: {
  items: FeedItem[];
  heading?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="text-lg font-medium mb-3">{heading}</h2>
      <ul className="divide-y divide-border/40">
        {items.map((item) => {
          const domain = itemDomain(item.url);
          return (
            <li key={`${item.sourceId}:${item.slug}`} className="py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <Link
                  href={feedItemPath(item)}
                  className="font-medium text-base hover:text-primary break-words"
                >
                  {item.title}
                </Link>
                {domain && (
                  <span className="text-xs text-muted-foreground">{domain}</span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.sourceLabel ? `${item.sourceLabel} · ` : ""}
                {item.score} points ·{" "}
                {formatDistanceToNow(new Date(item.time * 1000), {
                  addSuffix: true,
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
