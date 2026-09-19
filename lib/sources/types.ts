/**
 * Unified contract every news source adapter implements. Mirrors the
 * EmailProvider pattern in lib/email/provider.ts: the rest of the app only
 * ever talks to NewsProvider, never to a specific source's API.
 */

export type NewsCategory = "top" | "new" | "best" | "ask" | "show" | "job";

export interface NewsComment {
  externalId: string;
  author?: string;
  text?: string;
  createdAt?: Date;
  replies?: NewsComment[];
}

export interface NewsItem {
  /** Stable id within the source, e.g. HN's numeric item id. */
  externalId: string;
  sourceId: string;
  /** Human-facing label, e.g. "Hacker News", "r/programming", "The Verge". */
  sourceLabel: string;
  title: string;
  /** External article link (absent for self/text posts). */
  url?: string;
  /** Body for text posts (Ask HN style). May contain HTML. */
  text?: string;
  /** Short summary; falls back to meta-description fetching during ingest. */
  excerpt?: string;
  author?: string;
  score?: number;
  commentCount?: number;
  /** Topic tags supplied by the source itself (Lobsters tags, dev.to tags...). */
  tags?: string[];
  createdAt: Date;
  category: NewsCategory;
}

export interface GetStoriesOptions {
  limit?: number;
}

export interface SearchOptions {
  limit?: number;
}

export interface NewsProvider {
  readonly id: string;
  readonly displayName: string;
  /** Categories this source can serve; the ingest runner iterates these. */
  readonly categories: readonly NewsCategory[];
  getStories(category: NewsCategory, options?: GetStoriesOptions): Promise<NewsItem[]>;
  getStory(externalId: string): Promise<NewsItem | null>;
  search?(query: string, options?: SearchOptions): Promise<NewsItem[]>;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { accept: "application/json", ...(init?.headers ?? {}) },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      throw new Error(`Request to ${url} failed with ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
