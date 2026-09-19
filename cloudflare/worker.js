/**
 * Cloudflare Worker cron scheduler for the Next.js app.
 *
 * Instead of Vercel Cron, Cloudflare triggers the app's authenticated ingest
 * endpoint on a schedule. This keeps scheduling off the Vercel plan and lets
 * any deployment (Vercel, Fly, a VPS) share the same cron.
 *
 * Secrets (set with `wrangler secret put`, never committed):
 *   APP_URL     - base URL of the deployed site, e.g. https://example.com
 *   CRON_SECRET - must match the app's CRON_SECRET env var
 *
 * The map below is keyed by the cron expression in wrangler.toml, so adding a
 * job is: one entry here + one entry in wrangler.toml's crons array.
 */

const JOBS = {
  "*/30 * * * *": "/api/cron/ingest",
  // Moving the newsletter crons off Vercel? Uncomment these, add the matching
  // expressions to wrangler.toml, and remove them from vercel.json so each job
  // runs in exactly one place.
  // "30 1 * * *": "/api/send-newsletter",
  // "30 2 * * 1": "/api/send-recommended",
};

async function trigger(env, path) {
  const appUrl = env.APP_URL && env.APP_URL.replace(/\/$/, "");
  if (!appUrl) {
    throw new Error("APP_URL secret is not configured");
  }

  const response = await fetch(`${appUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
  });

  const body = await response.text();
  const preview = body.length > 500 ? `${body.slice(0, 500)}…` : body;
  console.log(`${path} -> ${response.status} ${preview}`);

  return { path, status: response.status, body: preview };
}

export default {
  async scheduled(controller, env, ctx) {
    const path = JOBS[controller.cron] ?? JOBS["*/30 * * * *"];
    ctx.waitUntil(
      trigger(env, path).catch((error) => console.error("cron job failed:", error)),
    );
  },

  // Manual trigger for local testing / backfills:
  //   curl -H "x-trigger-key: $CRON_SECRET" https://<worker>/ingest
  async fetch(request, env) {
    if (request.headers.get("x-trigger-key") !== env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const path = JOBS[url.searchParams.get("cron") ?? ""] ?? JOBS["*/30 * * * *"];
    const result = await trigger(env, path);
    return Response.json(result, { status: result.status });
  },
};
