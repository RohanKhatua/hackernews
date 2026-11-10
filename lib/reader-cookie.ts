import { cookies } from "next/headers";

/**
 * Server-side reader identity. Middleware issues an httpOnly `hn_reader`
 * cookie on the first API request and forwards it downstream, so route
 * handlers read identity from the cookie — never from a client-supplied
 * payload. Pages never read it, which keeps page responses cacheable.
 */
export const READER_COOKIE = "hn_reader";

export const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Reads the reader id from the request cookie jar, or null if absent. */
export async function getReaderId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(READER_COOKIE)?.value ?? null;
}

/** Reads the reader id, failing loudly when the cookie is missing. */
export async function requireReaderId(): Promise<string> {
  const readerId = await getReaderId();
  if (!readerId) {
    throw new Error("Missing reader cookie");
  }
  return readerId;
}
