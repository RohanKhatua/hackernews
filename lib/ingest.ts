import { prisma } from "@/lib/db";
import { cachedArticleExcerpt } from "@/lib/excerpts";
import { getStoryDomain } from "@/lib/hn";
import { extractKeywords } from "@/lib/keywords";
import { providers as allProviders } from "@/lib/sources/registry";
import { buildArticleSlug, shortHash, slugify } from "@/lib/sources/slug";
import type { NewsCategory, NewsItem, NewsProvider } from "@/lib/sources/types";

const EXCERPT_CONCURRENCY = 5;

export interface IngestionSummary {
  providerId: string;
  category: NewsCategory;
  fetched: number;
  upserted: number;
  keywords: number;
  errors: string[];
}

export interface RunIngestionOptions {
  sourceIds?: string[];
  categories?: NewsCategory[];
  limitPerCategory?: number;
}

export interface RunIngestionResult {
  summaries: IngestionSummary[];
  durationMs: number;
  ok: boolean;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/** Resolves a keyword row for a term, handling slug collisions safely. */
async function ensureKeyword(term: string): Promise<string> {
  const existing = await prisma.keyword.findUnique({ where: { term } });
  if (existing) return existing.id;

  const baseSlug = slugify(term) || "topic";
  try {
    const created = await prisma.keyword.create({
      data: { term, slug: baseSlug },
    });
    return created.id;
  } catch {
    // Either another worker created the term, or the slug is taken.
    const byTerm = await prisma.keyword.findUnique({ where: { term } });
    if (byTerm) return byTerm.id;
    const created = await prisma.keyword.create({
      data: { term, slug: `${baseSlug}-${shortHash(term)}` },
    });
    return created.id;
  }
}

async function upsertArticle(
  item: NewsItem,
  excerpt: string | undefined,
): Promise<{ id: string; keywordCount: number }> {
  const slug = buildArticleSlug(item.title, item.sourceId, item.externalId);
  const domain = getStoryDomain(item.url) ?? undefined;
  const where = {
    sourceId_externalId: { sourceId: item.sourceId, externalId: item.externalId },
  };

  const shared = {
    title: item.title,
    url: item.url,
    text: item.text,
    author: item.author,
    sourceLabel: item.sourceLabel,
    domain,
    score: item.score,
    commentCount: item.commentCount,
    publishedAt: item.createdAt,
  };

  const existing = await prisma.article.findUnique({
    where,
    select: { id: true, categories: true, excerpt: true },
  });

  const article = existing
    ? await prisma.article.update({
        where: { id: existing.id },
        data: {
          ...shared,
          excerpt: existing.excerpt ?? excerpt,
          categories: Array.from(new Set([...existing.categories, item.category])),
        },
      })
    : await prisma.article.create({
        data: {
          ...shared,
          excerpt,
          slug,
          sourceId: item.sourceId,
          externalId: item.externalId,
          categories: [item.category],
        },
      });

  const keywords = extractKeywords({
    title: item.title,
    text: item.text,
    excerpt: excerpt ?? item.excerpt,
    tags: item.tags,
  });

  const previousLinks = await prisma.articleKeyword.findMany({
    where: { articleId: article.id },
    select: { keywordId: true },
  });

  const keywordIds = await Promise.all(
    keywords.map(async (keyword) => ({
      id: await ensureKeyword(keyword.term),
      weight: keyword.weight,
    })),
  );

  await prisma.$transaction([
    prisma.articleKeyword.deleteMany({ where: { articleId: article.id } }),
    prisma.articleKeyword.createMany({
      data: keywordIds.map((keyword) => ({
        articleId: article.id,
        keywordId: keyword.id,
        weight: keyword.weight,
      })),
      skipDuplicates: true,
    }),
  ]);

  // Recompute counts for every keyword this article touched, including ones it
  // no longer links to, so stale counts don't linger.
  const touchedKeywordIds = new Set([
    ...previousLinks.map((link) => link.keywordId),
    ...keywordIds.map((keyword) => keyword.id),
  ]);

  await Promise.all(
    [...touchedKeywordIds].map(async (keywordId) => {
      const articleCount = await prisma.articleKeyword.count({
        where: { keywordId },
      });
      await prisma.keyword.update({
        where: { id: keywordId },
        data: { articleCount },
      });
    }),
  );

  return { id: article.id, keywordCount: keywordIds.length };
}

export async function ingestProviderCategory(
  provider: NewsProvider,
  category: NewsCategory,
  limit: number,
): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    providerId: provider.id,
    category,
    fetched: 0,
    upserted: 0,
    keywords: 0,
    errors: [],
  };

  let items: NewsItem[] = [];
  try {
    items = await provider.getStories(category, { limit });
    summary.fetched = items.length;
  } catch (error) {
    summary.errors.push(`fetch: ${String(error)}`);
    return summary;
  }

  // Enrich with article meta descriptions (cached for 24h across the process).
  const excerpts = await mapWithConcurrency(items, EXCERPT_CONCURRENCY, async (item) => {
    if (item.excerpt) return item.excerpt;
    if (!item.url) return undefined;
    return (await cachedArticleExcerpt(item.url)) ?? undefined;
  });

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await upsertArticle(items[i], excerpts[i]);
      summary.upserted += 1;
      summary.keywords += result.keywordCount;
    } catch (error) {
      summary.errors.push(`${items[i].externalId}: ${String(error)}`);
    }
  }

  return summary;
}

export async function runIngestion(
  options: RunIngestionOptions = {},
): Promise<RunIngestionResult> {
  const startedAt = Date.now();
  const limit = options.limitPerCategory ?? 30;

  const selected = allProviders.filter(
    (provider) =>
      !options.sourceIds?.length || options.sourceIds.includes(provider.id),
  );

  const summaries = await Promise.all(
    selected.map(async (provider) => {
      const categories = provider.categories.filter(
        (category) =>
          !options.categories?.length || options.categories.includes(category),
      );

      const providerSummaries: IngestionSummary[] = [];
      // Categories run sequentially per provider to stay polite to the APIs.
      for (const category of categories) {
        providerSummaries.push(
          await ingestProviderCategory(provider, category, limit),
        );
      }
      return providerSummaries;
    }),
  );

  const flat = summaries.flat();

  // Drop keywords no article references anymore (e.g. after a re-extraction).
  try {
    await prisma.keyword.deleteMany({ where: { articleCount: 0 } });
  } catch (error) {
    console.error("Failed to prune empty keywords:", error);
  }

  return {
    summaries: flat,
    durationMs: Date.now() - startedAt,
    ok: flat.every((summary) => summary.errors.length === 0),
  };
}
