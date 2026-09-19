import { NextRequest, NextResponse } from "next/server";
import { sendTop5Email, sendRecommendedEmail } from "@/lib/email-utils";
import { getAdminUser } from "@/lib/auth-utils";
import { headers } from "next/headers";

// Vercel Cron authentication. Vercel sends `Authorization: Bearer <CRON_SECRET>`
// for scheduled invocations when the CRON_SECRET env var is configured.
function validateCronSecret(headersList: Headers): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authorization = headersList.get("authorization");
  return authorization === `Bearer ${cronSecret}`;
}

// API key authentication function
function validateApiKey(headersList: Headers): boolean {
  const apiKey = headersList.get("x-api-key");
  const validApiKey = process.env.NEWSLETTER_API_KEY;

  // If no API key is configured in environment, this authentication method is disabled
  if (!validApiKey) {
    return false;
  }

  return apiKey === validApiKey;
}

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const admin = await getAdminUser();
    const isAuthorized =
      Boolean(admin) ||
      validateCronSecret(headersList) ||
      validateApiKey(headersList);

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
