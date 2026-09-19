import { NextRequest, NextResponse } from "next/server";
import { fetchStory, type HackerNewsStory } from "@/lib/hn";
import { recordStoryInteraction } from "@/lib/recommendations";
import { ensureReader } from "@/lib/db";
import { verifyTrackingToken } from "@/lib/tokens";

function appOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

/**
 * Email click tracking. Story/article links in newsletters are wrapped in
 * this route: it records a "read" interaction under the subscriber's
 * synthetic email reader (`email:<subscriberId>`) so email engagement feeds
 * recommendations, then redirects to the destination.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = params.get("token");
  const storyId = Number(params.get("storyId"));
  const to = params.get("to");

  // Never trap the reader on a tracking failure.
  const fallback = Number.isFinite(storyId) && storyId > 0
    ? `${appOrigin(request)}/item/${storyId}`
    : appOrigin(request);

  try {
    const subscriberId = token ? verifyTrackingToken(token) : null;

    if (subscriberId) {
      // The subscriber's dedicated email-click reader keeps email signals
      // separate from any browser's history while sharing the same profile.
      const emailReaderId = `email:${subscriberId}`;
      await ensureReader(emailReaderId, subscriberId);

      // Only allow http(s) destinations — the token is signed, but stay
      // strict about where a link may send the reader.
      const target = to && /^https?:\/\//i.test(to) ? to : fallback;
      const story: HackerNewsStory | null = await fetchStory(storyId);

      if (story?.id && story.title) {
        await recordStoryInteraction({
          readerId: emailReaderId,
          subscriberId,
          story,
          type: "read",
        });
      }

      return NextResponse.redirect(target, 302);
    }
  } catch (error) {
    console.warn("Could not record email click:", error);
  }

  return NextResponse.redirect(fallback, 302);
}
