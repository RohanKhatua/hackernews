import { NextRequest, NextResponse } from "next/server";
import { getRecommendedStories } from "@/lib/recommendations";

export async function GET(request: NextRequest) {
  try {
    const readerId = request.nextUrl.searchParams.get("readerId") ?? "";

    if (!readerId) {
      return NextResponse.json(
        { success: false, message: "Reader ID required" },
        { status: 400 },
      );
    }

    const stories = await getRecommendedStories({ readerId, limit: 15 });

    return NextResponse.json({ success: true, stories });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}
