import { NextResponse } from "next/server";
import { getAllActiveSubscribers } from "@/lib/db";

export async function GET() {
	try {
		// Fetch all active subscribers
		const subscribers = await getAllActiveSubscribers();

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
