# Repository instructions

## Verification

- Use Bun (`bun install`, `bun run ...`); the root `postinstall` runs `prisma generate`.
- Run `bun run lint` and `bunx tsc --noEmit` for focused verification. `bun run build` is the production build, but `next.config.mjs` currently ignores ESLint and TypeScript errors during builds, so do not treat a passing build as type/lint verification.
- There is no test script or configured test suite.

## Structure and runtime

- This is a single Next.js App Router application: pages/UI are under `app/` and `components/`; server-side HN fetching and business logic live in `lib/`; API handlers are `app/api/**/route.ts`.
- `lib/hn.ts` fetches and caches official Hacker News API data with a 5-minute revalidation window. `middleware.ts` creates the anonymous reader cookie and must keep forwarding it to downstream handlers.
- PostgreSQL access is through the singleton Prisma client in `lib/db.ts`. The schema is `prisma/schema.prisma`; apply database changes with Prisma migrations and regenerate the client after schema changes (`bunx prisma migrate dev`, `bunx prisma generate`). Do not edit generated Prisma output under `app/generated/` by hand.
- `react-emails/` is a separate Bun package for React Email templates (`bun run dev` from that directory); it has its own manifest and lockfile.

## Configuration and operations

- Copy `.env.example` to `.env` for local setup. Database/auth/email integrations require `DATABASE_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL`; cron/API/webhook authentication uses `CRON_SECRET`, `NEWSLETTER_API_KEY`, `UNSUBSCRIBE_SECRET`, and `RESEND_WEBHOOK_SECRET`.
- The first admin is created once through `/setup` (`/api/admin/setup` rejects setup after an admin exists). Admin and newsletter routes rely on NextAuth and the shared Prisma database.
- Vercel cron invokes `/api/send-newsletter` daily and `/api/send-recommended` weekly; preserve their authorization checks when changing these routes. Email delivery is abstracted in `lib/email/provider.ts` and currently defaults to Resend.

## Change constraints

- Keep shadcn components under `components/ui/` and use the aliases configured in `components.json` (`@/components`, `@/lib`, `@/hooks`).
- Do not commit or push changes, and do not run git commands; leave version control to the repository owner.
