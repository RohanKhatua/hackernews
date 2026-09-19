/**
 * Header-based authentication for newsletter send endpoints (Vercel Cron
 * bearer secret or API key). The logged-in admin check stays in the route
 * handlers since it needs the session.
 */
export function validateCronSecret(headersList: Headers): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authorization = headersList.get("authorization");
  return authorization === `Bearer ${cronSecret}`;
}

export function validateApiKey(headersList: Headers): boolean {
  const apiKey = headersList.get("x-api-key");
  const validApiKey = process.env.NEWSLETTER_API_KEY;

  // If no API key is configured in environment, this authentication method is disabled
  if (!validApiKey) {
    return false;
  }

  return apiKey === validApiKey;
}

export function isNewsletterSendAuthorized(headersList: Headers): boolean {
  return validateCronSecret(headersList) || validateApiKey(headersList);
}
