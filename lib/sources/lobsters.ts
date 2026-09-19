import {
  fetchJson,
  type NewsCategory,
  type NewsItem,
  type NewsProvider,
} from "@/lib/sources/types";

const LOBSTERS_SOURCE_ID = "lobsters";
const LOBSTERS_DISPLAY_NAME = "Lobsters";
const LOBSTERS_BASE_URL = "https://lobste.rs";
const LOBSTERS_CATEGORIES: readonly NewsCategory[] = ["top", "new"];

type LobstersStory = {
  short_id: string;
  created_at?: string;
  title?: string;
  url?: string;
  description?: string;
  score?: number;
  comment_count?: number;
  submitter_user?: string | { username?: string };
  tags?: string[];
};

function submitterName(user: LobstersStory["submitter_user"]): string | undefined {
  if (!user) return undefined;
  return typeof user === "string" ? user : user.username;
}

function toNewsItem(story: LobstersStory, category: NewsCategory): NewsItem {
  return {
    externalId: story.short_id,
    sourceId: LOBSTERS_SOURCE_ID,
    sourceLabel: LOBSTERS_DISPLAY_NAME,
    title: story.title ?? "",
    url: story.url,
    excerpt: story.description || undefined,
    author: submitterName(story.submitter_user),
    score: story.score,
    commentCount: story.comment_count,
    tags: story.tags,
    createdAt: story.created_at ? new Date(story.created_at) : new Date(),
    category,
  };
}

export function createLobstersProvider(): NewsProvider {
  return {
    id: LOBSTERS_SOURCE_ID,
    displayName: LOBSTERS_DISPLAY_NAME,
    categories: LOBSTERS_CATEGORIES,

    async getStories(category, options) {
      const endpoint = category === "new" ? "newest" : "hottest";
      const stories = await fetchJson<LobstersStory[]>(
        `${LOBSTERS_BASE_URL}/${endpoint}.json`,
      );
      const limit = options?.limit ?? 30;
      return (stories ?? [])
        .filter((story) => story.short_id && story.title)
        .slice(0, limit)
        .map((story) => toNewsItem(story, category));
    },

    async getStory(externalId) {
      const story = await fetchJson<LobstersStory>(
        `${LOBSTERS_BASE_URL}/s/${externalId}.json`,
      );
      if (!story?.short_id || !story.title) return null;
      return toNewsItem(story, "top");
    },

    async search(query, options) {
      const limit = options?.limit ?? 30;
      const stories = await fetchJson<LobstersStory[]>(
        `${LOBSTERS_BASE_URL}/search.json?q=${encodeURIComponent(query)}&what=stories&order=relevance`,
      );
      return (stories ?? [])
        .filter((story) => story.short_id && story.title)
        .slice(0, limit)
        .map((story) => toNewsItem(story, "top"));
    },
  };
}
