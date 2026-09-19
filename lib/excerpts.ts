import type { HackerNewsStory } from "@/lib/hn";

const MAX_EXCERPT_LENGTH = 220;
// Meta tags live in the <head>, so we only need the first part of the page.
// Capping the read also keeps us from downloading huge articles when all we
// want is a description.
const MAX_BODY_BYTES = 128 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const META_DESCRIPTION_TAGS = new Set([
  "og:description",
  "description",
  "twitter:description",
]);

/**
 * Fetches the first chunk of `url` and returns its text. Throws on any
 * non-HTML response, network error, or timeout so callers can degrade
 * gracefully.
 */
async function readHead(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  let readerDone = false;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; HackerNewsNewsletter/1.0; +https://news.ycombinator.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    try {
      while (received < MAX_BODY_BYTES) {
        const { done, value } = await reader.read();
        if (done) {
          readerDone = true;
          break;
        }
        chunks.push(value);
        received += value.byteLength;
      }
    } finally {
      if (!readerDone) {
        await reader.cancel().catch(() => {});
      }
    }

    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8").decode(buffer);
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripMarkup(html: string): string {
  return decodeHtmlEntities(html).replace(/<[^>]+>/g, " ");
}

function cleanExcerpt(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= MAX_EXCERPT_LENGTH) return trimmed;
  // Cut on a word boundary, not mid-word.
  const slice = trimmed.slice(0, MAX_EXCERPT_LENGTH - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

/**
 * Extracts a meta description (og:description, description, or
 * twitter:description) from raw HTML, preferring og:description.
 */
function extractMetaDescription(html: string): string | null {
  let ogDescription: string | null = null;
  let genericDescription: string | null = null;

  const metaTags = html.match(/<meta\s[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const name = tag
      .match(/\b(?:name|property)=["']([^"']+)["']/i)?.[1]
      ?.toLowerCase();
    if (!name || !META_DESCRIPTION_TAGS.has(name)) continue;

    let content = tag.match(/\bcontent=(["'])(.*?)\1/i)?.[2];
    if (!content) {
      // Unquoted content attribute, e.g. content=foo.
      content = tag.match(/\bcontent=([^\s>]+)/i)?.[1];
    }
    if (!content) continue;

    if (name === "og:description" && !ogDescription) {
      ogDescription = content;
    } else if (!genericDescription) {
      genericDescription = content;
    }
  }

  return ogDescription ?? genericDescription;
}

/** Fetches a short excerpt (meta description) for an external article URL. */
export async function fetchArticleExcerpt(
  url: string | undefined,
): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  let html: string;
  try {
    html = await readHead(url);
  } catch (error) {
    console.warn(`Could not fetch excerpt for ${url}: ${String(error)}`);
    return null;
  }

  const description = extractMetaDescription(html);
  if (!description) return null;

  return cleanExcerpt(decodeHtmlEntities(description.replace(/\s+/g, " ")));
}

type CacheEntry = { fetchedAt: number; excerpt: string | null };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const excerptCache = new Map<string, CacheEntry>();

// Excerpts are fetched during email rendering, and the recommended email is
// rendered once per subscriber (different story sets, but lots of overlap).
// Cache misses the hobby server would otherwise hammer a given site with many
// duplicate requests in a single broadcast.
function cachedArticleExcerpt(url: string | undefined): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return Promise.resolve(null);

  const hit = excerptCache.get(url);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(hit.excerpt);
  }

  return fetchArticleExcerpt(url).then((excerpt) => {
    if (excerptCache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = excerptCache.keys().next().value;
      if (oldestKey !== undefined) excerptCache.delete(oldestKey);
    }
    excerptCache.set(url, { fetchedAt: Date.now(), excerpt });
    return excerpt;
  });
}

/**
 * Enriches each story with an `excerpt` when one can be found:
 * the linked article's meta description, falling back to the story's own
 * `text` for self posts (Ask HN, Show HN, etc.).
 */
export async function addExcerpts(
  stories: HackerNewsStory[],
): Promise<HackerNewsStory[]> {
  return Promise.all(
    stories.map(async (story) => {
      if (story.excerpt) return story;

      const articleExcerpt = await cachedArticleExcerpt(story.url);
      if (articleExcerpt) return { ...story, excerpt: articleExcerpt };

      const selfText = story.text ? cleanExcerpt(stripMarkup(story.text)) : null;
      return selfText ? { ...story, excerpt: selfText } : story;
    }),
  );
}