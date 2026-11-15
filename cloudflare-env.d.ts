/**
 * Cloudflare bindings used by the application, as an ambient interface
 * alongside `getCloudflareContext()` from @opennextjs/cloudflare.
 *
 * Deliberately minimal (no @cloudflare/workers-types globals): that package
 * redefines `Response`/`Request` and breaks the DOM lib that Next.js needs.
 * After adding a binding to wrangler.jsonc, extend this interface (or run
 * `bun run cf-typegen` and merge its output into a module-scoped import).
 */
interface HyperdriveBinding {
	/** Pooled Postgres connection string for this binding. */
	connectionString: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CloudflareEnv {
	/** Hyperdrive-backed Postgres connection (see lib/db.ts). */
	HYPERDRIVE?: HyperdriveBinding;
}
