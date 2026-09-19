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

      // The email stores the destination as base64url so query strings and
      // ampersands cannot be rewritten by email clients. Decode it before
      // redirecting, and only allow absolute http(s) URLs.
      let target = fallback;
      if (to) {
        try {
          const decoded = Buffer.from(to, "base64url").toString("utf8");
          const destination = new URL(decoded);
          if (destination.protocol === "http:" || destination.protocol === "https:") {
            target = destination.toString();
          }
        } catch {
          // Keep the safe story fallback for malformed destinations.
        }
      }

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
