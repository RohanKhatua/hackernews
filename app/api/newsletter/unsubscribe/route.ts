import { removeSubscriber } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/tokens";

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
          button {
            background: #f97316;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>${body}</body>
    </html>`,
    { status, headers: { "Content-Type": "text/html" } },
  );
}

async function unsubscribe(token: string) {
  const subscriberId = verifyUnsubscribeToken(token);
  if (!subscriberId) {
    return { ok: false as const, reason: "invalid" };
  }

  const result = await removeSubscriber(subscriberId);
  if (!result.success) {
    return { ok: false as const, reason: "failed" };
  }

  return { ok: true as const };
}

// Human-facing link. Renders a confirmation page instead of mutating on GET,
// which protects against email clients prefetching the unsubscribe URL.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";

  if (!verifyUnsubscribeToken(token)) {
    return htmlPage(
      "Invalid link",
      `<h1>Invalid unsubscribe link</h1>
       <p>This unsubscribe link is invalid or has been tampered with.</p>
       <p>Please use the link from the most recent email you received.</p>`,
      400,
    );
  }

  return htmlPage(
    "Unsubscribe",
    `<h1>Unsubscribe from the Hacker News newsletter?</h1>
     <p>Confirm you no longer want to receive these emails.</p>
     <form method="POST" action="/api/newsletter/unsubscribe?token=${encodeURIComponent(
       token,
     )}">
       <button type="submit">Unsubscribe</button>
     </form>`,
  );
}

// One-click unsubscribe (RFC 8058) and the confirmation form above.
export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token") || "";

  if (!token) {
    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        token = body?.token || "";
      } else {
        const form = await request.formData();
        token = String(form.get("token") || "");
      }
    } catch {
      token = "";
    }
  }

  const result = await unsubscribe(token);

  if (!result.ok) {
    return htmlPage(
      "Invalid link",
      `<h1>Invalid unsubscribe link</h1>
       <p>This unsubscribe link is invalid or has been tampered with.</p>`,
      400,
    );
  }

  return htmlPage(
    "Unsubscribed",
    `<h1>Successfully Unsubscribed</h1>
     <p>You have been unsubscribed from the Hacker News newsletter.</p>
     <p>If this was a mistake, you can <a href="/">subscribe again</a>.</p>`,
  );
}
