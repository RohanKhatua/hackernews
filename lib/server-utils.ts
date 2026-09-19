"use server";

import { fetchStories, fetchStoryIds } from "@/lib/hn";

/**
 * Fetches the top stories for the current day, ordered by popularity
 * (HN score, descending).
 *
 * HN's `topstories` endpoint is a live, ever-changing ranking, so we filter
 * to stories posted since the start of today (UTC) so the newsletter reflects
 * "that day's" best stories. Early in the day there may not be `limit` of them
 * yet, in which case we fall back to the live top list so the email is never
 * short.
 */
export async function fetchTopStories(limit: number = 5) {
  try {
    const storyIds = await fetchStoryIds("top");
    const stories = await fetchStories(storyIds);

    const startOfToday = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    );
    const todaysStories = stories.filter(
      (story) => story.time !== undefined && story.time * 1000 >= startOfToday,
    );

    const pool = todaysStories.length >= limit ? todaysStories : stories;

    return [...pool]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching top stories: ", error);
    return [];
  }
}