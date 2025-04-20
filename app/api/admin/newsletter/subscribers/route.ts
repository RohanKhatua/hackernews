import { NextResponse } from "next/server";
import { getAllSubscribers } from "@/lib/db";

export async function GET() {
	try {
		// Fetch all subscribers (both active and inactive)
		const subscribers = await getAllSubscribers();

		return NextResponse.json({
			success: true,
			subscribers,
		});
	} catch (error) {
		console.error("Error fetching subscribers:", error);

		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch subscribers",
			},
			{ status: 500 }
		);
	}
}
