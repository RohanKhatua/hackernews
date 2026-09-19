import { NextResponse } from "next/server";
import { sendRecommendedEmail } from "@/lib/email-utils";
import { getAdminUser } from "@/lib/auth-utils";
import { isNewsletterSendAuthorized } from "@/lib/email/cron-auth";
import { headers } from "next/headers";

// Weekly recommended email. Triggered by Vercel Cron (see vercel.json) and by
// admins; the daily Top 5 lives at /api/send-newsletter.
export async function GET() {
  try {
    const headersList = await headers();
    const admin = await getAdminUser();
    const isAuthorized = Boolean(admin) || isNewsletterSendAuthorized(headersList);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await sendRecommendedEmail();

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
    console.error("Error sending recommended newsletter:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send recommended newsletter",
        error: String(error),
      },
      { status: 500 },
    );
  }
}
