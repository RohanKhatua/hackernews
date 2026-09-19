/**
 * Slug helpers shared by article URLs (/story/[slug]) and topic pages
 * (/topics/[slug]).
 */

const MAX_SLUG_LENGTH = 80;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

/** Short deterministic hash (base36) used to disambiguate slugs. */
export function shortHash(value: string, length = 6): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).padStart(length, "0").slice(-length);
}

/**
 * Article slugs always carry a short hash suffix so identical titles from
 * different sources (or retried ingests) can never collide.
 */
export function buildArticleSlug(title: string, sourceId: string, externalId: string): string {
  const base = slugify(title) || "story";
  return `${base}-${shortHash(`${sourceId}:${externalId}`)}`;
}
