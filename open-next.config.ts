import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// NOTE: intentionally using the default (in-memory) cache overrides.
// The R2 incremental cache + DO revalidation queue caused intermittent
// "Worker hung" runtime cancellations on ISR pages in production
// (fast-fail 500s on repeat requests of /, /best, /newest).
// Revisit when upstream ships a fix: restore `r2IncrementalCache`
// (bucket hackernews-opennext-cache) and the DO queue, then redeploy.
export default defineCloudflareConfig({});
