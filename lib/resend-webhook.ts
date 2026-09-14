import crypto from "crypto";

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verifies a Resend webhook signature (Svix scheme) without requiring the
 * `svix` dependency.
 *
 * @link https://docs.svix.com/receiving/verifying-payloads/how-manual
 */
export function verifyResendWebhook({
  svixId,
  svixTimestamp,
  svixSignature,
  payload,
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: {
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  payload: string;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  if (!svixId || !svixTimestamp || !svixSignature || !secret) {
    return false;
  }

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);

  return svixSignature.split(" ").some((part) => {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) {
      return false;
    }

    const provided = Buffer.from(signature);
    if (provided.length !== expectedBuffer.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(provided, expectedBuffer);
    } catch {
      return false;
    }
  });
}