"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
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

/**
 * Returns the current user if they are an admin, otherwise null.
 * Safe to use in API routes (does not redirect).
 */
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return null;
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
  name?: string,
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return {
        success: false,
        message: "Admin already exists",
      };
    }

    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "admin",
      },
    });

    return {
      success: true,
      adminId: admin.id,
    };
  } catch (error) {
    console.error("Failed to create admin user:", error);
    return {
      success: false,
      message: "Failed to create user",
    };
  }
}
