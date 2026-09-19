import { createDevToProvider } from "@/lib/sources/devto";
import { createHackerNewsProvider } from "@/lib/sources/hackernews";
import { createLobstersProvider } from "@/lib/sources/lobsters";
import { createRedditProvider } from "@/lib/sources/reddit";
import { createRssProvider } from "@/lib/sources/rss";
import type { NewsProvider } from "@/lib/sources/types";

/**
 * The registry of every news source the site ingests. Adding a new source is
 * (1) write an adapter implementing NewsProvider, or reuse createRssProvider,
 * then (2) add it to this array and run the ingest cron.
 */
export const providers: NewsProvider[] = [
  createHackerNewsProvider(),
  createLobstersProvider(),
  createRedditProvider({
    subreddits: ["programming", "webdev", "technology", "javascript"],
  }),
  createDevToProvider(),
  createRssProvider({
    id: "theverge",
    displayName: "The Verge",
    feeds: [{ url: "https://www.theverge.com/rss/index.xml" }],
  }),
  createRssProvider({
    id: "arstechnica",
    displayName: "Ars Technica",
    feeds: [{ url: "https://feeds.arstechnica.com/arstechnica/index" }],
  }),
];

export function getProvider(id: string): NewsProvider | undefined {
  return providers.find((provider) => provider.id === id);
}

export function getProviderIds(): string[] {
  return providers.map((provider) => provider.id);
}
