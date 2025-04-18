import { NextResponse } from "next/server";
import { addSubscriber } from "../../../../lib/db";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { email, name } = body;

		if (!email) {
			return NextResponse.json(
				{ success: false, error: "Email is required" },
				{ status: 400 }
			);
		}

		const result = await addSubscriber(email, name);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 400 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Successfully subscribed to newsletter",
		});
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, error: "Failed to process subscription" },
			{ status: 500 }
		);
	}
}
