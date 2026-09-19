import Link from "next/link";
import { FeedList } from "@/components/feed-list";
import { JsonLd } from "@/components/json-ld";
import { getFeed } from "@/lib/data";
import { feedItemPath, feedPageHref } from "@/lib/paths";
import { itemListJsonLd } from "@/lib/seo";
import type { NewsCategory } from "@/lib/sources/types";

export const FEED_PAGE_SIZE = 30;

export async function StoryFeed({
  category,
  page = 1,
  heading,
}: {
  category: NewsCategory;
  page?: number;
  heading?: string;
}) {
  const feed = await getFeed({ category, page, pageSize: FEED_PAGE_SIZE });

  if (feed.items.length === 0) {
    return (
      <p className="text-muted-foreground py-6">
        No stories available right now. Check back soon.
      </p>
    );
  }

  const startIndex = (feed.page - 1) * FEED_PAGE_SIZE + 1;

  return (
    <div>
      <JsonLd
        data={itemListJsonLd(
          `${heading ?? "Stories"} — page ${feed.page}`,
          feed.items.map((item) => ({
            title: item.title,
            path: feedItemPath(item),
          })),
        )}
      />

      <FeedList items={feed.items} startIndex={startIndex} />

      <nav
        className="flex justify-between items-center mt-6"
        aria-label="Pagination"
      >
        {feed.hasPrev ? (
          <Link
            href={feedPageHref(category, feed.page - 1)}
            className="text-sm hover:text-primary"
            rel="prev"
          >
            ← Previous
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground opacity-50">
            ← Previous
          </span>
        )}
        <span className="text-sm text-muted-foreground py-2">
          Page {feed.page}
        </span>
        {feed.hasNext ? (
          <Link
            href={feedPageHref(category, feed.page + 1)}
            className="text-sm hover:text-primary"
            rel="next"
          >
            Next →
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground opacity-50">
            Next →
          </span>
        )}
      </nav>
    </div>
  );
}
