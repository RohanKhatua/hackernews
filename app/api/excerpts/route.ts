import { NextRequest, NextResponse } from "next/server";
import { addExcerpts } from "@/lib/excerpts";
import { fetchStories } from "@/lib/hn";

// A page requests excerpts for one visible batch of stories. Cap the batch so
// this route can't be used to fan out unbounded outbound requests.
const MAX_STORIES = 50;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const rawIds: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
    const ids = Array.from(
      new Set(
        rawIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ).slice(0, MAX_STORIES);

    if (ids.length === 0) {
      return NextResponse.json({ success: true, excerpts: {} });
    }

    // Re-fetch the stories from HN rather than trusting URLs from the client,
    // so this route only ever fetches article links HN itself provides.
    const stories = await fetchStories(ids);
    const enriched = await addExcerpts(stories);

    const excerpts: Record<number, string> = {};
    for (const story of enriched) {
      if (story.excerpt) excerpts[story.id] = story.excerpt;
    }

    return NextResponse.json({ success: true, excerpts });
  } catch (error) {
    console.error("Error fetching excerpts:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch excerpts" },
      { status: 500 },
    );
  }
}
