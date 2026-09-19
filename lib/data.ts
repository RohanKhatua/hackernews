import type { Article, ArticleKeyword, Keyword } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addExcerpts } from "@/lib/excerpts";
import { fetchStories, fetchStoryIds } from "@/lib/hn";
import { buildArticleSlug } from "@/lib/sources/slug";
import type { NewsCategory } from "@/lib/sources/types";

/** A topic needs at least this many articles before it gets a landing page. */
export const MIN_TOPIC_ARTICLES = 3;

export interface TopicLink {
  term: string;
  slug: string;
}

/** Normalized shape the feed/list/detail UI renders, regardless of source. */
export interface FeedItem {
  /** Numeric HN item id for hackernews articles, 0 for everything else. */
  id: number;
  slug: string;
  sourceId: string;
  sourceLabel: string | null;
  title: string;
  url?: string;
  excerpt?: string;
  author: string;
  score: number;
  /** Unix seconds, matching the HN API shape used by StoryItem. */
  time: number;
  descendants: number;
  keywords: TopicLink[];
}

export interface FeedPage {
  items: FeedItem[];
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  /** True when the feed came from the live HN API rather than the database. */
  live: boolean;
}

type ArticleWithKeywords = Article & {
  keywords: (ArticleKeyword & { keyword: Keyword })[];
};

function topicLinks(
  links: (ArticleKeyword & { keyword: Keyword })[] | undefined,
  limit = 3,
): TopicLink[] {
  return (links ?? [])
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((link) => ({ term: link.keyword.term, slug: link.keyword.slug }));
}

export function mapArticle(article: ArticleWithKeywords): FeedItem {
  const isHn = article.sourceId === "hackernews";
  return {
    id: isHn ? Number(article.externalId) || 0 : 0,
    slug: article.slug,
    sourceId: article.sourceId,
    sourceLabel: article.sourceLabel,
    title: article.title,
    url: article.url ?? undefined,
    excerpt: article.excerpt ?? undefined,
    author: article.author ?? "unknown",
    score: article.score ?? 0,
    time: Math.floor(article.publishedAt.getTime() / 1000),
    descendants: article.commentCount ?? 0,
    keywords: topicLinks(article.keywords),
  };
}

const ARTICLE_INCLUDE = {
  keywords: { include: { keyword: true }, orderBy: { weight: "desc" } },
} as const;

function dedupeByUrl(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url ? item.url.replace(/[#?].*$/, "").replace(/\/$/, "") : item.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function orderForCategory(category: NewsCategory) {
  if (category === "top" || category === "best") {
    return [
      { score: { sort: "desc" as const, nulls: "last" as const } },
      { publishedAt: "desc" as const },
    ];
  }
  return [{ publishedAt: "desc" as const }];
}

/**
 * Live HN fallback so the site keeps working before the first ingest run (or
 * if the database is unavailable). Mirrors the DB ordering by score for top.
 */
async function liveHnFeed(
  category: NewsCategory,
  page: number,
  pageSize: number,
): Promise<FeedItem[]> {
  const ids = await fetchStoryIds(category);
  const start = (page - 1) * pageSize;
  const slice = ids.slice(start, start + pageSize);
  const stories = await addExcerpts(await fetchStories(slice));

  return stories
    .filter((story) => story.id && story.title)
    .map((story) => ({
      id: story.id,
      slug: buildArticleSlug(story.title, "hackernews", String(story.id)),
      sourceId: "hackernews",
      sourceLabel: "Hacker News",
      title: story.title,
      url: story.url,
      excerpt: story.excerpt,
      author: story.by ?? "unknown",
      score: story.score ?? 0,
      time: story.time ?? 0,
      descendants: story.descendants ?? 0,
      keywords: [],
    }));
}

export interface GetFeedOptions {
  category: NewsCategory;
  page?: number;
  pageSize?: number;
  sourceId?: string;
}

export async function getFeed({
  category,
  page = 1,
  pageSize = 30,
  sourceId,
}: GetFeedOptions): Promise<FeedPage> {
  const safePage = Math.max(1, page);

  try {
    const articles = await prisma.article.findMany({
      where: {
        categories: { has: category },
        ...(sourceId ? { sourceId } : {}),
      },
      include: ARTICLE_INCLUDE,
      orderBy: orderForCategory(category),
      skip: (safePage - 1) * pageSize,
      take: pageSize + 1,
    });

    if (articles.length > 0) {
      const hasNext = articles.length > pageSize;
      const items = dedupeByUrl(
        articles.slice(0, pageSize).map((article) => mapArticle(article)),
      );
      return {
        items,
        page: safePage,
        hasNext,
        hasPrev: safePage > 1,
        live: false,
      };
    }
  } catch (error) {
    console.error("Falling back to live HN feed:", error);
  }

  // Database has nothing for this feed yet (or errored): use HN directly.
  const items = await liveHnFeed(category, safePage, pageSize);
  const hnIds = await fetchStoryIds(category);
  return {
    items: dedupeByUrl(items),
    page: safePage,
    hasNext: safePage * pageSize < hnIds.length,
    hasPrev: safePage > 1,
    live: true,
  };
}

export async function getArticleBySlug(slug: string) {
  try {
    return await prisma.article.findUnique({
      where: { slug },
      include: ARTICLE_INCLUDE,
    });
  } catch (error) {
    console.error("Failed to load article by slug:", error);
    return null;
  }
}

export async function getArticleBySource(sourceId: string, externalId: string) {
  try {
    return await prisma.article.findUnique({
      where: { sourceId_externalId: { sourceId, externalId } },
      include: ARTICLE_INCLUDE,
    });
  } catch (error) {
    console.error("Failed to load article by source:", error);
    return null;
  }
}

export interface ArticleDetail {
  id: string;
  sourceId: string;
  externalId: string;
  slug: string;
  title: string;
  url?: string;
  text?: string;
  excerpt?: string;
  author?: string;
  sourceLabel?: string;
  domain?: string;
  score: number;
  commentCount: number;
  publishedAt: Date;
  keywords: TopicLink[];
  primaryKeywordId?: string;
  related: FeedItem[];
}

/** Full detail (keywords + related stories) for a /story/[slug] page. */
export async function getArticleDetail(
  slug: string,
): Promise<ArticleDetail | null> {
  const article = await getArticleBySlug(slug);
  if (!article) return null;

  const sortedLinks = article.keywords
    .slice()
    .sort((a, b) => b.weight - a.weight);
  const related = await getRelatedArticles(article.id, 6);

  return {
    id: article.id,
    sourceId: article.sourceId,
    externalId: article.externalId,
    slug: article.slug,
    title: article.title,
    url: article.url ?? undefined,
    text: article.text ?? undefined,
    excerpt: article.excerpt ?? undefined,
    author: article.author ?? undefined,
    sourceLabel: article.sourceLabel ?? undefined,
    domain: article.domain ?? undefined,
    score: article.score ?? 0,
    commentCount: article.commentCount ?? 0,
    publishedAt: article.publishedAt,
    keywords: sortedLinks.slice(0, 8).map((link) => ({
      term: link.keyword.term,
      slug: link.keyword.slug,
    })),
    primaryKeywordId: sortedLinks[0]?.keywordId,
    related,
  };
}

async function articlesByIds(ids: string[]): Promise<FeedItem[]> {
  if (ids.length === 0) return [];
  const articles = await prisma.article.findMany({
    where: { id: { in: ids } },
    include: ARTICLE_INCLUDE,
  });
  const byId = new Map(articles.map((article) => [article.id, article]));
  return ids
    .map((id) => byId.get(id))
    .filter((article): article is ArticleWithKeywords => Boolean(article))
    .map(mapArticle);
}

/**
 * Articles that share keywords with the given article, ranked by summed
 * keyword weight. Powers the "Related stories" internal-link block.
 */
export async function getRelatedArticles(
  articleId: string,
  limit = 6,
): Promise<FeedItem[]> {
  try {
    const links = await prisma.articleKeyword.findMany({
      where: { articleId },
      select: { keywordId: true },
    });
    const keywordIds = links.map((link) => link.keywordId);
    if (keywordIds.length === 0) return [];

    const related = await prisma.articleKeyword.groupBy({
      by: ["articleId"],
      where: {
        keywordId: { in: keywordIds },
        articleId: { not: articleId },
      },
      _sum: { weight: true },
      orderBy: { _sum: { weight: "desc" } },
      take: limit,
    });

    return await articlesByIds(related.map((row) => row.articleId));
  } catch (error) {
    console.error("Failed to load related articles:", error);
    return [];
  }
}

export interface TopicPage {
  keyword: Keyword;
  items: FeedItem[];
}

export async function getTopicBySlug(slug: string): Promise<TopicPage | null> {
  try {
    const keyword = await prisma.keyword.findUnique({ where: { slug } });
    if (!keyword || keyword.articleCount < MIN_TOPIC_ARTICLES) return null;

    const articles = await prisma.article.findMany({
      where: { keywords: { some: { keywordId: keyword.id } } },
      include: ARTICLE_INCLUDE,
      orderBy: [
        { score: { sort: "desc", nulls: "last" } },
        { publishedAt: "desc" },
      ],
      take: 60,
    });

    return { keyword, items: articles.map(mapArticle) };
  } catch (error) {
    console.error("Failed to load topic:", error);
    return null;
  }
}

export interface TopicSummary extends TopicLink {
  articleCount: number;
}

export async function getTopTopics(
  limit = 200,
  minArticles = MIN_TOPIC_ARTICLES,
): Promise<TopicSummary[]> {
  try {
    const keywords = await prisma.keyword.findMany({
      where: { articleCount: { gte: minArticles } },
      orderBy: [{ articleCount: "desc" }, { term: "asc" }],
      take: limit,
    });
    return keywords.map((keyword) => ({
      term: keyword.term,
      slug: keyword.slug,
      articleCount: keyword.articleCount,
    }));
  } catch (error) {
    console.error("Failed to load topics:", error);
    return [];
  }
}

/** Keywords that co-occur with a topic, used for topical cross-linking. */
export async function getRelatedTopics(
  keywordId: string,
  limit = 12,
): Promise<TopicSummary[]> {
  try {
    const links = await prisma.articleKeyword.findMany({
      where: { keywordId },
      select: { articleId: true },
      take: 100,
    });
    const articleIds = links.map((link) => link.articleId);
    if (articleIds.length === 0) return [];

    const related = await prisma.articleKeyword.groupBy({
      by: ["keywordId"],
      where: {
        articleId: { in: articleIds },
        keywordId: { not: keywordId },
      },
      _count: { articleId: true },
      orderBy: { _count: { articleId: "desc" } },
      take: limit,
    });

    const keywords = await prisma.keyword.findMany({
      where: {
        id: { in: related.map((row) => row.keywordId) },
        articleCount: { gte: MIN_TOPIC_ARTICLES },
      },
    });
    const byId = new Map(keywords.map((keyword) => [keyword.id, keyword]));
    return related
      .map((row) => byId.get(row.keywordId))
      .filter((keyword): keyword is Keyword => Boolean(keyword))
      .map((keyword) => ({
        term: keyword.term,
        slug: keyword.slug,
        articleCount: keyword.articleCount,
      }));
  } catch (error) {
    console.error("Failed to load related topics:", error);
    return [];
  }
}

export async function getRecentArticleSlugs(
  limit = 5000,
): Promise<{ slug: string; sourceId: string; externalId: string; publishedAt: Date }[]> {
  try {
    return await prisma.article.findMany({
      select: { slug: true, sourceId: true, externalId: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("Failed to load article slugs for sitemap:", error);
    return [];
  }
}
