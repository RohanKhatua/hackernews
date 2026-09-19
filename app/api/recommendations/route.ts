import { NextResponse } from "next/server";
import { getRecommendedStories } from "@/lib/recommendations";
import { getReaderId } from "@/lib/reader-cookie";

export async function GET() {
  try {
    const readerId = await getReaderId();

    if (!readerId) {
      return NextResponse.json(
        { success: false, message: "Reader cookie missing" },
        { status: 400 },
      );
    }

    const { stories, coldStart } = await getRecommendedStories({
      readerId,
      limit: 15,
    });

    return NextResponse.json({ success: true, stories, coldStart });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}
