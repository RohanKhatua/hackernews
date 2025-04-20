"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { headers } from "next/headers";

export async function getSession() {
	return await getServerSession(authOptions);
}

export async function getCurrentUser() {
	const session = await getSession();
	return session?.user;
}

export async function requireAuth() {
	const user = await getCurrentUser();
	if (!user) {
		redirect("/auth/login");
	}
	return user;
}

export async function requireAdmin() {
	// Get the current request path
	const headersList = headers();
	const path = (await headersList).get("x-invoke-path") || "";

	// Skip auth check for the setup endpoints
	if (
		path === "/api/admin/setup" ||
		path === "/setup" ||
		path === "/admin/setup"
	) {
		return null;
	}

	const user = await requireAuth();
	if (user.role !== "admin") {
		redirect("/");
	}
	return user;
}

export async function createAdminUser(
	email: string,
	password: string,
	name?: string
) {
	const hashedPassword = await bcrypt.hash(password, 10);

	try {
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return {
				success: false,
				message: "User already exists",
			};
		}

		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
				role: "admin",
			},
		});

		return {
			success: true,
			userId: user.id,
		};
	} catch (error) {
		console.error("Failed to create admin user:", error);
		return {
			success: false,
			message: "Failed to create user",
		};
	}
}
