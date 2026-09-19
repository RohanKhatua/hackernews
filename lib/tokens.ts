import crypto from "crypto";

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "Missing UNSUBSCRIBE_SECRET (or NEXTAUTH_SECRET) for signing tokens",
    );
  }

  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

/**
 * Creates a URL-safe token of the form `<base64url(value)>.<hmac>`.
 * The value is not secret, but it cannot be tampered with without the secret.
 */
export function createSignedToken(value: string): string {
  const encoded = Buffer.from(value, "utf8").toString("base64url");
  return `${encoded}.${sign(value)}`;
}

/**
 * Verifies a token created by `createSignedToken` and returns the original
 * value, or null when the token is malformed or the signature is invalid.
 */
export function verifySignedToken(token: string): string | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) {
    return null;
  }

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  let value: string;
  try {
    value = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(value);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (provided.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(provided, expectedBuffer)) {
    return null;
  }

  return value;
}

const UNSUBSCRIBE_PREFIX = "unsub:";

export function createUnsubscribeToken(subscriberId: string): string {
  return createSignedToken(`${UNSUBSCRIBE_PREFIX}${subscriberId}`);
}

export function verifyUnsubscribeToken(token: string): string | null {
  const value = verifySignedToken(token);
  if (!value || !value.startsWith(UNSUBSCRIBE_PREFIX)) {
    return null;
  }

  return value.slice(UNSUBSCRIBE_PREFIX.length);
}

const TRACK_PREFIX = "track:";

/** Signed per-subscriber token carried by tracked email links. */
export function createTrackingToken(subscriberId: string): string {
  return createSignedToken(`${TRACK_PREFIX}${subscriberId}`);
}

export function verifyTrackingToken(token: string): string | null {
  const value = verifySignedToken(token);
  if (!value || !value.startsWith(TRACK_PREFIX)) {
    return null;
  }

  return value.slice(TRACK_PREFIX.length);
}
