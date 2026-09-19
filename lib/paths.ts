/**
 * Client-safe path helpers for feed items. Kept separate from lib/data so
 * client components can import them without pulling in Prisma.
 */

import type { NewsCategory } from "@/lib/sources/types";

export interface PathItem {
  /** Numeric HN item id; 0 for articles from other sources. */
  id: number;
  slug: string;
}

export function feedItemPath(item: PathItem): string {
  return item.id > 0 ? `/item/${item.id}` : `/story/${item.slug}`;
}

export function itemDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Route for each category feed. */
export const CATEGORY_ROUTES: Record<NewsCategory, string> = {
  top: "/",
  new: "/newest",
  best: "/best",
  ask: "/ask",
  show: "/show",
  job: "/jobs",
};

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  top: "Top stories",
  new: "Newest stories",
  best: "Best stories",
  ask: "Ask HN",
  show: "Show HN",
  job: "Jobs",
};

export const CATEGORY_DESCRIPTIONS: Record<NewsCategory, string> = {
  top: "The top stories and discussions in tech right now, from Hacker News, Lobsters, Reddit, DEV Community and leading publications.",
  new: "The newest stories and discussions in tech, updated continuously across every source we track.",
  best: "The highest-scoring tech stories and discussions of all time on Hacker News and beyond.",
  ask: "Ask HN: questions and answers from the Hacker News community on programming, startups and technology.",
  show: "Show HN: projects, tools and side projects shared by the Hacker News community.",
  job: "Tech jobs and hiring posts from the Hacker News community.",
};

/** Crawlable pagination href for a category feed. */
export function feedPageHref(category: NewsCategory, page: number): string {
  const base = CATEGORY_ROUTES[category];
  return page <= 1 ? base : `${base}?page=${page}`;
}

/** Parses the `?page=` search param into a positive integer. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}
