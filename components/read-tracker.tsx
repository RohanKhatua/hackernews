"use client";

import { useEffect } from "react";

interface ReadTrackerProps {
  story: {
    id: number;
    title: string;
    url?: string;
    score?: number;
    by?: string;
    time?: number;
    descendants?: number;
  };
}

/**
 * Records a "read" interaction for the story once on mount. Identity comes
 * from the httpOnly reader cookie set by middleware; the payload carries no
 * user data.
 */
export function ReadTracker({ story }: ReadTrackerProps) {
  useEffect(() => {
    fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ storyId: story.id, type: "read", story }),
    }).catch((error) => {
      console.error("Error recording story view:", error);
    });
    // Record once per story id; the story object is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  return null;
}
