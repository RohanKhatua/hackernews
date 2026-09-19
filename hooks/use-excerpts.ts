"use client";

import { useEffect, useRef, useState } from "react";

interface ExcerptSource {
  id: number;
}

/**
 * Fetches short excerpts (article meta descriptions, or the story's own text)
 * for a list of stories. Mirrors the email workflow: enrichment happens on the
 * server via `addExcerpts`, and results are cached in memory across requests.
 *
 * Excerpts arrive asynchronously, so callers should render rows without them
 * and update once the map is populated.
 */
export function useExcerpts(stories: ExcerptSource[]): Record<number, string> {
  const [excerpts, setExcerpts] = useState<Record<number, string>>({});
  const storiesRef = useRef(stories);
  storiesRef.current = stories;

  // Depend on the set of ids, not the array identity, so a new array with the
  // same stories (e.g. a re-render) doesn't trigger a duplicate request.
  const key = stories.map((story) => story.id).join(",");

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();

    fetch("/api/excerpts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: storiesRef.current.map((story) => story.id),
      }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.excerpts) {
          setExcerpts((prev) => ({ ...prev, ...data.excerpts }));
        }
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name !== "AbortError") {
          console.error("Error fetching excerpts:", error);
        }
      });

    return () => controller.abort();
  }, [key]);

  return excerpts;
}
