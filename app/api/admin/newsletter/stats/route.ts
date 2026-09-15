import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-utils";
import { getEmailStats } from "@/lib/email/logging";

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const email = await getEmailStats();

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Error fetching newsletter stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}