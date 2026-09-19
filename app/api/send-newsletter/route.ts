import { NextRequest, NextResponse } from "next/server";
import { sendTop5Email, sendRecommendedEmail } from "@/lib/email-utils";
import { getAdminUser } from "@/lib/auth-utils";
import {
  isNewsletterSendAuthorized,
} from "@/lib/email/cron-auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const admin = await getAdminUser();
    const isAuthorized =
      Boolean(admin) || isNewsletterSendAuthorized(headersList);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const isTest = searchParams.get("test") === "true";
    const isRecommended = searchParams.get("recommended") === "true";

    if (isTest && !email) {
      return NextResponse.json(
        { success: false, message: "Test email recipient is required" },
        { status: 400 },
      );
    }

    const send = isRecommended ? sendRecommendedEmail : sendTop5Email;
    const result = await send(isTest ? email! : undefined);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error sending newsletter:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send newsletter",
        error: String(error),
      },
      { status: 500 },
    );
  }
}
