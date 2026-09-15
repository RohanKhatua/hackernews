import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-utils";
import { getEmailLogs } from "@/lib/email/logging";

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const result = await getEmailLogs({
      status: searchParams.get("status") ?? undefined,
      kind: searchParams.get("kind") ?? undefined,
      query: searchParams.get("query") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 25,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch email logs" },
      { status: 500 },
    );
  }
}
