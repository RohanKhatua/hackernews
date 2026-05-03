import { NextResponse } from "next/server";
import { removeSubscriber, removeSubscriberByEmail } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subscriberId = url.searchParams.get("id");
  const email = url.searchParams.get("email");

  if (!subscriberId && !email) {
    return NextResponse.json(
      { success: false, error: "Subscriber ID or email is required" },
      { status: 400 },
    );
  }

  try {
    const result = subscriberId
      ? await removeSubscriber(subscriberId)
      : await removeSubscriberByEmail(email!);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return new Response(
      `<html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
              text-align: center;
              line-height: 1.6;
            }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>Successfully Unsubscribed</h1>
          <p>You have been unsubscribed from the Hacker News newsletter.</p>
          <p>If this was a mistake, you can <a href="/">subscribe again</a>.</p>
        </body>
      </html>`,
      {
        headers: {
          "Content-Type": "text/html",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to process unsubscription" },
      { status: 500 },
    );
  }
}
