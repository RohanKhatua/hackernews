import type { HackerNewsStory } from "@/lib/hn";

const MAX_EXCERPT_LENGTH = 220;
// Anything shorter than this reads like a tagline or fragment, not a summary.
const MIN_EXCERPT_LENGTH = 40;
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

// Boilerplate that commonly ends up in a meta description but tells the reader
// nothing about the article: cookie/consent banners, JS-required notices,
// bot challenges, error pages, and paywall/sign-in prompts.
const BAD_EXCERPT_PATTERNS: RegExp[] = [
  /\bthis (site|website) uses cookies\b/i,
  /\bwe use cookies\b/i,
  /\baccept (all )?cookies\b/i,
  /\b(cookie|consent) (policy|preferences|settings|notice)\b/i,
  /\bto (improve|enhance) your (experience|browsing)\b/i,
  /\bby (continuing|browsing|clicking)[^.]*\byou (agree|accept|consent)\b/i,
  /\byou need to (enable|turn on|have) javascript\b/i,
  /\bjavascript (is )?(disabled|required|not enabled|must be enabled)\b/i,
  /\benable javascript (to|in order to|and)\b/i,
  /\byour browser (is )?(not|does not|doesn't) support\b/i,
  /\baccess (denied|restricted|forbidden)\b/i,
  /\b(403|404)\b[^.]*\b(forbidden|not found)\b/i,
  /\bpage (not found|doesn't exist|does not exist|could not be found)\b/i,
  /\bjust a moment\b/i,
  /\bchecking your browser\b/i,
  /\battention required\b/i,
  /\bverify(ing)? (that )?you are (a )?human\b/i,
  /\b(sign|log) in to (continue|read|view|access)\b/i,
  /\bsubscribe (now |today )?to (read|continue|unlock|access)\b/i,
  /^(read|learn|find out) more\.?$/i,
];

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

/** True when a cleaned excerpt is too short, single-token, or boilerplate. */
function isBadExcerpt(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < MIN_EXCERPT_LENGTH) return true;
  // A lone token (site name, URL, "Comments") is never a useful summary.
  if (!/\s/.test(trimmed)) return true;
  return BAD_EXCERPT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * True when the excerpt is just the story title (optionally with a short
 * suffix like a site name), which adds nothing for the reader.
 */
function isTitleEcho(excerpt: string, title: string): boolean {
  const cleanedExcerpt = normalizeForComparison(excerpt);
  const cleanedTitle = normalizeForComparison(title);
  if (!cleanedExcerpt || !cleanedTitle) return false;
  if (cleanedExcerpt === cleanedTitle) return true;

  const [shorter, longer] =
    cleanedExcerpt.length <= cleanedTitle.length
      ? [cleanedExcerpt, cleanedTitle]
      : [cleanedTitle, cleanedExcerpt];
  // Only treat a prefix match as an echo when the extra text is a brief
  // suffix (e.g. "| Site Name"), not a genuine summary that continues.
  return longer.startsWith(shorter) && longer.length - shorter.length <= 25;
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

  const excerpt = cleanExcerpt(
    decodeHtmlEntities(description.replace(/\s+/g, " ")),
  );
  if (!excerpt || isBadExcerpt(excerpt)) return null;

  return excerpt;
}

type CacheEntry = { fetchedAt: number; excerpt: string | null };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const excerptCache = new Map<string, CacheEntry>();

// Excerpts are fetched during email rendering, and the recommended email is
// rendered once per subscriber (different story sets, but lots of overlap).
// Cache misses the hobby server would otherwise hammer a given site with many
// duplicate requests in a single broadcast.
export function cachedArticleExcerpt(url: string | undefined): Promise<string | null> {
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
      if (articleExcerpt && !isTitleEcho(articleExcerpt, story.title)) {
        return { ...story, excerpt: articleExcerpt };
      }

      const selfText = story.text
        ? cleanExcerpt(stripMarkup(story.text))
        : null;
      return selfText &&
        !isBadExcerpt(selfText) &&
        !isTitleEcho(selfText, story.title)
        ? { ...story, excerpt: selfText }
        : story;
    }),
  );
}
