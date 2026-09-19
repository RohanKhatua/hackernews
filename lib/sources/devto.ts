import {
  fetchJson,
  type NewsCategory,
  type NewsItem,
  type NewsProvider,
} from "@/lib/sources/types";

const DEVTO_SOURCE_ID = "devto";
const DEVTO_DISPLAY_NAME = "DEV Community";
const DEVTO_CATEGORIES: readonly NewsCategory[] = ["top", "new"];

type DevToArticle = {
  id: number;
  title?: string;
  description?: string;
  url?: string;
  published_at?: string;
  positive_reactions_count?: number;
  comments_count?: number;
  tag_list?: string[];
  user?: { username?: string; name?: string };
};

function toNewsItem(article: DevToArticle, category: NewsCategory): NewsItem {
  return {
    externalId: String(article.id),
    sourceId: DEVTO_SOURCE_ID,
    sourceLabel: DEVTO_DISPLAY_NAME,
    title: article.title ?? "",
    url: article.url,
    excerpt: article.description || undefined,
    author: article.user?.username ?? article.user?.name,
    score: article.positive_reactions_count,
    commentCount: article.comments_count,
    tags: article.tag_list,
    createdAt: article.published_at ? new Date(article.published_at) : new Date(),
    category,
  };
}

export function createDevToProvider(): NewsProvider {
  return {
    id: DEVTO_SOURCE_ID,
    displayName: DEVTO_DISPLAY_NAME,
    categories: DEVTO_CATEGORIES,

    async getStories(category, options) {
      const limit = options?.limit ?? 30;
      const query =
        category === "new"
          ? `per_page=${limit}`
          : `per_page=${limit}&top=1`;
      const articles = await fetchJson<DevToArticle[]>(
        `https://dev.to/api/articles?${query}`,
      );
      return (articles ?? [])
        .filter((article) => article.id && article.title)
        .map((article) => toNewsItem(article, category));
    },

    async getStory(externalId) {
      const article = await fetchJson<DevToArticle>(
        `https://dev.to/api/articles/${encodeURIComponent(externalId)}`,
      );
      return article?.id ? toNewsItem(article, "top") : null;
    },
  };
}
