import { NextRequest, NextResponse } from "next/server";
import { prisma, linkReaderToSubscriber } from "@/lib/db";
import { getReaderId } from "@/lib/reader-cookie";
import { getSiteUrl } from "@/lib/seo";

const REDIRECT_BASE = "/recommended";

function redirect(status: "claimed" | "invalid" | "no-cookie") {
  return NextResponse.redirect(
    new URL(`${REDIRECT_BASE}?claim=${status}`, getSiteUrl()),
    302,
  );
}

/**
 * Magic link (Subscriber.recommendationToken) that binds the *current*
 * browser's reading history to the subscriber — used from the welcome email
 * to link devices beyond the one that confirmed.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return redirect("invalid");

    const subscriber = await prisma.subscriber.findUnique({
      where: { recommendationToken: token },
    });
    if (!subscriber) return redirect("invalid");

    const readerId = await getReaderId();
    if (!readerId) return redirect("no-cookie");

    await linkReaderToSubscriber(readerId, subscriber.id);

    return redirect("claimed");
  } catch (error) {
    console.error("Error claiming reader history:", error);
    return redirect("invalid");
  }
}
