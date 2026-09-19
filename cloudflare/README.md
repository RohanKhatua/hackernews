# Cloudflare cron worker

Schedules the app's ingestion endpoint with a Cloudflare Worker Cron Trigger
instead of Vercel Cron.

## One-time setup

```bash
# From the repo root. `bunx` downloads wrangler on demand.
cd cloudflare
bunx wrangler login
bunx wrangler secret put APP_URL      # e.g. https://your-app.example.com
bunx wrangler secret put CRON_SECRET  # same value as the app's CRON_SECRET
```

`CRON_SECRET` must match the environment variable used by the Next.js app
(`.env` locally, the deployment's env in production). The ingest route accepts
`Authorization: Bearer $CRON_SECRET`.

## Deploy / update

```bash
bun run worker:deploy      # bunx wrangler deploy --config cloudflare/wrangler.toml
```

## Test locally

```bash
bun run worker:dev
# in another shell:
curl -H "x-trigger-key: $CRON_SECRET" "http://localhost:8787/?cron=*/30 * * * *"
```

You can also exercise the app endpoint directly without the worker:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/ingest?source=hackernews&category=top&limit=10"
```

## Scheduling

Jobs are keyed by cron expression in `worker.js` (`JOBS`) and must also appear
in `wrangler.toml`'s `crons` array. The default schedule runs ingestion every
30 minutes. To move the newsletter jobs (`/api/send-newsletter`,
`/api/send-recommended`) off Vercel, uncomment the entries in both files and
remove them from `vercel.json` so each job runs in exactly one place.
