import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import type { Subscriber } from "@prisma/client";
import crypto from "crypto";

export type AddSubscriberResult =
  | { success: true; subscriber: Subscriber; alreadyConfirmed: boolean }
  | { success: false; error: string };

export type ConfirmSubscriberResult =
  | { success: true; subscriber: Subscriber }
  | { success: false; error: string };

/**
 * Builds a Prisma Client for the current request.
 *
 * Cloudflare Workers do not allow a pooled connection created in one request
 * context to be reused in another — a global client "will cause subsequent
 * requests to fail" (opennext.js.org/cloudflare/howtos/db). So the client is
 * created per request: React `cache()` dedupes it within one request, and
 * `maxUses: 1` makes every pooled pg socket single-use.
 *
 * - `getDb` uses the sync context (request handlers / server components).
 * - `getDbAsync` uses the async context (ISR/SSG revalidation, where there is
 *   no incoming request).
 * - Outside Workers (`next dev`, `next build`, CI) both fall back to a plain
 *   Node singleton with the same pool hygiene.
 *
 * The exported `prisma` is a Proxy that delegates to `getDb()` per property
 * access, so the ~16 existing `prisma.<model>` call sites stay untouched.
 */

const POOL_CONFIG = {
  // Workers pool hygiene: stale sockets must fail fast, never wedge the
  // isolate ("Worker hung").
  max: 3,
  maxUses: 1,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  query_timeout: 30_000,
  statement_timeout: 30_000,
} as const;

function newClient(connectionString: string): PrismaClient {
  return new PrismaClient({
    log: ["info", "warn", "error"],
    adapter: new PrismaPg({ connectionString, ...POOL_CONFIG }),
  });
}

let nodeDevClient: PrismaClient | null = null;

function hyperdriveConnectionString(): string | null {
  try {
    const { env } = getCloudflareContext();
    const fromBinding = (
      env as { HYPERDRIVE?: { connectionString?: string } }
    ).HYPERDRIVE?.connectionString;
    return fromBinding ?? process.env.DATABASE_URL ?? null;
  } catch {
    // No request context (ISR revalidation) or plain Node runtime.
    return process.env.DATABASE_URL ?? null;
  }
}

export const getDb = cache((): PrismaClient => {
  const connectionString = hyperdriveConnectionString();
  if (connectionString) return newClient(connectionString);
  nodeDevClient ??= newClient(process.env.DATABASE_URL ?? "");
  return nodeDevClient;
});

export async function getDbAsync(): Promise<PrismaClient> {
  const connectionString = hyperdriveConnectionString();
  if (connectionString) return newClient(connectionString);
  nodeDevClient ??= newClient(process.env.DATABASE_URL ?? "");
  return nodeDevClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client as unknown as object, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Subscriber management functions
export async function addSubscriber(
  email: string,
  name?: string,
  readerId?: string,
): Promise<AddSubscriberResult> {
  const normalizedEmail = normalizeEmail(email);

  try {
    const existing = await prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });

    // Already confirmed subscribers are simply reactivated.
    if (existing?.confirmedAt) {
      const subscriber = await prisma.subscriber.update({
        where: { email: normalizedEmail },
        data: { name: name || existing.name, active: true },
      });

      if (readerId) {
        await linkReaderToSubscriber(readerId, subscriber.id);
      }

      return { success: true, subscriber, alreadyConfirmed: true };
    }

    // New (or still unconfirmed) subscribers start inactive until they confirm.
    const confirmationToken = crypto.randomUUID();
    const subscriber = await prisma.subscriber.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        name: name || undefined,
        active: false,
        confirmationToken,
      },
      update: {
        name: name || undefined,
        active: false,
        confirmationToken,
      },
    });

    if (readerId) {
      await linkReaderToSubscriber(readerId, subscriber.id);
    }

    return { success: true, subscriber, alreadyConfirmed: false };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add subscriber"),
    };
  }
}

export async function confirmSubscriber(
  confirmationToken: string,
): Promise<ConfirmSubscriberResult> {
  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { confirmationToken },
    });

    if (!subscriber) {
      return { success: false, error: "Invalid confirmation token" };
    }

    if (subscriber.confirmedAt) {
      return { success: true, subscriber };
    }

    const confirmed = await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        active: true,
        confirmedAt: new Date(),
        confirmationToken: null,
      },
    });

    return { success: true, subscriber: confirmed };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to confirm subscriber"),
    };
  }
}

export async function getSubscriberByEmail(email: string) {
  return prisma.subscriber.findUnique({ where: { email: normalizeEmail(email) } });
}

/**
 * Creates the Reader row for a browser identity if it does not exist yet.
 * Safe to call on every interaction.
 */
export async function ensureReader(
  readerId: string,
  subscriberId?: string,
) {
  return prisma.reader.upsert({
    where: { id: readerId },
    create: { id: readerId, subscriberId },
    update: subscriberId ? { subscriberId } : {},
  });
}

/**
 * Binds a browser identity to a subscriber. Existing interactions stay keyed
 * by readerId, so linking is instant and lossless — the reader simply gains a
 * subscriberId and future profile builds pick it up.
 */
export async function linkReaderToSubscriber(
  readerId: string,
  subscriberId: string,
) {
  await ensureReader(readerId, subscriberId);
  return prisma.reader.update({
    where: { id: readerId },
    data: { subscriberId },
  });
}

export async function removeSubscriber(subscriberId: string) {
  try {
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { active: false },
    });
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove subscriber"),
    };
  }
}

export async function getAllActiveSubscribers() {
  return prisma.subscriber.findMany({
    where: { active: true, confirmedAt: { not: null } },
  });
}

/**
 * Deactivates a subscriber by email. Used for hard bounces and spam complaints
 * so we stop emailing an address that cannot receive mail.
 */
export async function deactivateSubscriberByEmail(email: string) {
  try {
    await prisma.subscriber.update({
      where: { email: normalizeEmail(email) },
      data: { active: false },
    });
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to deactivate subscriber"),
    };
  }
}

// Function to get all subscribers including inactive ones (for admin panel)
export async function getAllSubscribers() {
  return prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
}