import { NextRequest, NextResponse } from "next/server";
import { createAdminUser } from "@/lib/auth-utils";
import { requireAdmin } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
	try {
		// Make sure the request is from an admin
		await requireAdmin();

		const { email, password, name } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ success: false, message: "Email and password are required" },
				{ status: 400 }
			);
		}

		const result = await createAdminUser(email, password, name);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, message: result.message },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ success: true, userId: result.userId },
			{ status: 201 }
		);
	} catch (error: any) {
		console.error("Error creating admin user:", error);

		if (error.message === "UNAUTHORIZED") {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{ success: false, message: "Failed to create user" },
			{ status: 500 }
		);
	}
}
