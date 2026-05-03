"use server";

import { fetchStories, fetchStoryIds } from "@/lib/hn";

export async function fetchTopStories(limit: number = 5) {
  try {
    const storyIds = await fetchStoryIds("top");
    return fetchStories(storyIds.slice(0, limit));
  } catch (error) {
    console.error("Error fetching top stories: ", error);
    return [];
  }
}
