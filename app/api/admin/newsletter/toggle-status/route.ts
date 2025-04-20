import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { id, active } = body;

		if (!id) {
			return NextResponse.json(
				{ success: false, error: "Subscriber ID is required" },
				{ status: 400 }
			);
		}

		// Update the subscriber's active status
		const updatedSubscriber = await prisma.subscriber.update({
			where: { id },
			data: { active: active !== undefined ? active : false },
		});

		return NextResponse.json({
			success: true,
			subscriber: updatedSubscriber,
		});
	} catch (error: any) {
		console.error("Error toggling subscriber status:", error);
		return NextResponse.json(
			{ success: false, error: error.message || "Failed to update subscriber" },
			{ status: 500 }
		);
	}
}
