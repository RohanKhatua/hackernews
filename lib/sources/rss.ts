import { XMLParser } from "fast-xml-parser";
import {
  type NewsCategory,
  type NewsItem,
  type NewsProvider,
} from "@/lib/sources/types";

const RSS_CATEGORIES: readonly NewsCategory[] = ["top", "new"];
const FETCH_TIMEOUT_MS = 8000;

export interface RssFeed {
  /** Feed URL. May be RSS 2.0 or Atom. */
  url: string;
  /** Overrides the provider label (e.g. a specific section of a publication). */
  sourceLabel?: string;
}

export interface RssProviderConfig {
  id: string;
  displayName: string;
  feeds: RssFeed[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
});

type XmlValue = unknown;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function asText(value: XmlValue): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, XmlValue>;
    const text = record["#text"];
    if (typeof text === "string") return text.trim() || undefined;
    const href = record["@_href"];
    if (typeof href === "string") return href;
  }
  return undefined;
}

function stripHtml(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

function parseDate(value: string | undefined): Date {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/** Picks the alternate link from an Atom entry's possibly-array-of-links. */
function atomLink(entry: Record<string, XmlValue>): string | undefined {
  const links = asArray(entry.link as XmlValue);
  const candidates = links
    .map((link) =>
      typeof link === "object" && link !== null
        ? (link as Record<string, XmlValue>)
        : undefined,
    )
    .filter((link): link is Record<string, XmlValue> => Boolean(link));

  const alternate = candidates.find(
    (link) => !link["@_rel"] || link["@_rel"] === "alternate",
  );
  return asText(alternate ?? candidates[0]) ?? asText(entry.link);
}

function normalizeTags(value: XmlValue): string[] | undefined {
  const tags = asArray(value)
    .map((tag) => {
      if (typeof tag === "string") return tag.trim();
      if (typeof tag === "object" && tag !== null) {
        const record = tag as Record<string, XmlValue>;
        return typeof record["@_term"] === "string"
          ? record["@_term"].trim()
          : asText(record);
      }
      return undefined;
    })
    .filter((tag): tag is string => Boolean(tag));
  return tags.length > 0 ? tags : undefined;
}

type ParsedFeed = {
  rss?: { channel?: Record<string, XmlValue> };
  feed?: Record<string, XmlValue>;
};

/** Maps either an RSS <item> or an Atom <entry> to a NewsItem. */
function toNewsItem(
  entry: Record<string, XmlValue>,
  feed: RssFeed,
  providerId: string,
  defaultLabel: string,
  category: NewsCategory,
): NewsItem | null {
  const isAtom = !("pubDate" in entry) && ("published" in entry || "updated" in entry || "id" in entry);

  const title = asText(entry.title);
  if (!title) return null;

  const link = isAtom ? atomLink(entry) : asText(entry.link);
  const id = asText(entry.id) ?? asText(entry.guid) ?? link;
  if (!id) return null;

  const rawExcerpt =
    asText(entry["content:encoded"]) ??
    asText(entry.content) ??
    asText(entry.summary) ??
    asText(entry.description);
  const excerpt = stripHtml(rawExcerpt);

  const authorRecord = entry.author;
  const author = isAtom
    ? asText(
        typeof authorRecord === "object" && authorRecord !== null
          ? (authorRecord as Record<string, XmlValue>).name
          : authorRecord,
      )
    : asText(entry["dc:creator"]) ?? asText(entry.author);

  return {
    externalId: String(id),
    sourceId: providerId,
    sourceLabel: feed.sourceLabel ?? defaultLabel,
    title,
    url: link,
    excerpt,
    author,
    tags: normalizeTags(entry.category),
    createdAt: parseDate(
      asText(entry.pubDate) ??
        asText(entry.published) ??
        asText(entry.updated) ??
        asText(entry["dc:date"]),
    ),
    category,
  };
}

async function fetchXml(url: string): Promise<ParsedFeed | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      throw new Error(`Feed ${url} returned ${response.status}`);
    }
    return parser.parse(await response.text()) as ParsedFeed;
  } catch (error) {
    console.error(`Error fetching feed ${url}:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function entriesFromFeed(parsed: ParsedFeed): Record<string, XmlValue>[] {
  if (parsed.rss?.channel) {
    return asArray(parsed.rss.channel.item as XmlValue).filter(
      (item): item is Record<string, XmlValue> =>
        typeof item === "object" && item !== null,
    );
  }
  if (parsed.feed) {
    return asArray(parsed.feed.entry as XmlValue).filter(
      (entry): entry is Record<string, XmlValue> =>
        typeof entry === "object" && entry !== null,
    );
  }
  return [];
}

/**
 * Creates a provider for any number of RSS 2.0 / Atom feeds. This is the
 * "bring your own publication" adapter: adding a newspaper or blog is a
 * one-line config change in lib/sources/registry.ts.
 */
export function createRssProvider(config: RssProviderConfig): NewsProvider {
  async function loadFeed(
    feed: RssFeed,
    category: NewsCategory,
  ): Promise<NewsItem[]> {
    const parsed = await fetchXml(feed.url);
    if (!parsed) return [];
    return entriesFromFeed(parsed)
      .map((entry) =>
        toNewsItem(entry, feed, config.id, config.displayName, category),
      )
      .filter((item): item is NewsItem => Boolean(item));
  }

  return {
    id: config.id,
    displayName: config.displayName,
    categories: RSS_CATEGORIES,

    async getStories(category, options) {
      const limit = options?.limit ?? 30;
      const results = await Promise.all(
        config.feeds.map((feed) => loadFeed(feed, category)),
      );
      return results
        .flat()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async getStory(externalId) {
      for (const feed of config.feeds) {
        const items = await loadFeed(feed, "top");
        const match = items.find(
          (item) => item.externalId === externalId || item.url === externalId,
        );
        if (match) return match;
      }
      return null;
    },
  };
}
