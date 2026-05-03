import { NextRequest, NextResponse } from "next/server";
import { fetchStory } from "@/lib/hn";
import { recordStoryInteraction } from "@/lib/recommendations";

const allowedTypes = new Set(["read", "like", "dismiss"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storyId = Number(body.storyId);
    const type = String(body.type ?? "read");
    const readerId = String(body.readerId ?? "");

    if (!readerId || !Number.isFinite(storyId) || !allowedTypes.has(type)) {
      return NextResponse.json(
        { success: false, message: "Invalid interaction payload" },
        { status: 400 },
      );
    }

    const story =
      body.story?.id && body.story?.title
        ? body.story
        : await fetchStory(storyId);

    if (!story?.id || !story.title) {
      return NextResponse.json(
        { success: false, message: "Story not found" },
        { status: 404 },
      );
    }

    await recordStoryInteraction({
      readerId,
      story,
      type: type as "read" | "like" | "dismiss",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording interaction:", error);
    return NextResponse.json(
      { success: false, message: "Failed to record interaction" },
      { status: 500 },
    );
  }
}
