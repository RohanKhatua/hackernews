import { NextResponse } from "next/server";
import { confirmSubscriber } from "@/lib/db";

function htmlPage(title: string, body: string, status = 200) {
  return new Response(
    `<html>
      <head>
        <title>${title}</title>
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
          a { color: #f97316; }
        </style>
      </head>
      <body>${body}</body>
    </html>`,
    { status, headers: { "Content-Type": "text/html" } },
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return htmlPage(
        "Invalid link",
        `<h1>Invalid confirmation link</h1>
         <p>This confirmation link is missing its token.</p>`,
        400,
      );
    }

    const result = await confirmSubscriber(token);

    if (!result.success) {
      return htmlPage(
        "Invalid link",
        `<h1>Invalid confirmation link</h1>
         <p>This link is invalid or has already been used.</p>
         <p>You can <a href="/">subscribe again</a> from the home page.</p>`,
        400,
      );
    }

    return htmlPage(
      "Subscribed",
      `<h1>You're subscribed!</h1>
       <p>Your email has been confirmed. You'll start receiving the Hacker News
       newsletter with the top stories and recommendations.</p>
       <p><a href="/">Back to Hacker News</a></p>`,
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to process confirmation" },
      { status: 500 },
    );
  }
}