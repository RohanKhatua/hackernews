import { NextRequest, NextResponse } from "next/server";
import { createAdminUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// This route should only work when there are no users in the system
// Use it to create the first admin user, then it will be disabled
export async function POST(request: NextRequest) {
	try {
		// Check if any users exist
		const userCount = await prisma.user.count();

		// If users already exist, this route is disabled
		if (userCount > 0) {
			return NextResponse.json(
				{ success: false, message: "Setup already completed" },
				{ status: 403 }
			);
		}

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
			{ success: true, message: "Admin setup complete", userId: result.userId },
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error in initial setup:", error);
		return NextResponse.json(
			{ success: false, message: "Failed to complete setup" },
			{ status: 500 }
		);
	}
}
