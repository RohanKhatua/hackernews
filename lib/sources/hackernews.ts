import {
  fetchStory,
  fetchStoryIds,
  fetchStories,
} from "@/lib/hn";
import { fetchJson, type NewsCategory, type NewsItem, type NewsProvider } from "@/lib/sources/types";

const HN_SOURCE_ID = "hackernews";
const HN_DISPLAY_NAME = "Hacker News";
const HN_CATEGORIES: readonly NewsCategory[] = ["top", "new", "best", "ask", "show", "job"];

function toNewsItem(story: {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by?: string;
  score?: number;
  descendants?: number;
  time?: number;
  type?: string;
}): NewsItem {
  return {
    externalId: String(story.id),
    sourceId: HN_SOURCE_ID,
    sourceLabel: HN_DISPLAY_NAME,
    title: story.title,
    url: story.url,
    text: story.text,
    author: story.by,
    score: story.score,
    commentCount: story.descendants,
    createdAt: new Date((story.time ?? Math.floor(Date.now() / 1000)) * 1000),
    category: categoryFromType(story.type),
  };
}

function categoryFromType(type?: string): NewsCategory {
  switch (type) {
    case "job":
      return "job";
    case "poll":
      return "top";
    default:
      return "top";
  }
}

type AlgoliaHit = {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_text?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
};

export function createHackerNewsProvider(): NewsProvider {
  return {
    id: HN_SOURCE_ID,
    displayName: HN_DISPLAY_NAME,
    categories: HN_CATEGORIES,

    async getStories(category, options) {
      const limit = options?.limit ?? 30;
      const ids = await fetchStoryIds(category);
      const stories = await fetchStories(ids.slice(0, limit));
      return stories
        .filter((story) => story.id && story.title)
        .map((story) => ({ ...toNewsItem(story), category }));
    },

    async getStory(externalId) {
      const story = await fetchStory(Number(externalId));
      if (!story?.id || !story.title) return null;
      return toNewsItem(story);
    },

    async search(query, options) {
      const limit = options?.limit ?? 30;
      const data = await fetchJson<{ hits?: AlgoliaHit[] }>(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`,
      );

      return (data?.hits ?? [])
        .map((hit) => hit)
        .filter((hit) => hit.title || hit.story_title)
        .map((hit) => ({
          externalId: hit.objectID,
          sourceId: HN_SOURCE_ID,
          sourceLabel: HN_DISPLAY_NAME,
          title: hit.title ?? hit.story_title ?? "",
          url: hit.url,
          text: hit.story_text,
          author: hit.author,
          score: hit.points,
          commentCount: hit.num_comments,
          createdAt: hit.created_at ? new Date(hit.created_at) : new Date(),
          category: "top" as NewsCategory,
        }));
    },
  };
}
