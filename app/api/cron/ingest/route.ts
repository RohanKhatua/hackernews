import { NextResponse } from "next/server";
import { validateApiKey, validateCronSecret } from "@/lib/email/cron-auth";
import { runIngestion } from "@/lib/ingest";
import { getProviderIds } from "@/lib/sources/registry";
import type { NewsCategory } from "@/lib/sources/types";

/**
 * Ingestion endpoint. Invoked on a schedule by the Cloudflare Worker in
 * cloudflare/worker.js (or manually / with the API key). Auth mirrors the
 * newsletter cron endpoints: `Authorization: Bearer $CRON_SECRET` or the
 * `x-api-key` header.
 *
 * Optional query params:
 *   ?source=hackernews,lobsters   limit to specific providers
 *   ?category=top,new             limit to specific categories
 *   ?limit=30                     items per category (default 30)
 */

export const maxDuration = 60;

const VALID_CATEGORIES: readonly NewsCategory[] = [
  "top",
  "new",
  "best",
  "ask",
  "show",
  "job",
];

function parseList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

async function handle(request: Request) {
  const headers = request.headers;
  if (!validateCronSecret(headers) && !validateApiKey(headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceIds = parseList(searchParams.get("source"));
  if (sourceIds?.some((id) => !getProviderIds().includes(id))) {
    return NextResponse.json(
      { error: `Unknown source. Valid sources: ${getProviderIds().join(", ")}` },
      { status: 400 },
    );
  }

  const categories = parseList(searchParams.get("category")) as
    | NewsCategory[]
    | undefined;
  if (categories?.some((category) => !VALID_CATEGORIES.includes(category))) {
    return NextResponse.json(
      { error: `Unknown category. Valid categories: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }

  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  try {
    const result = await runIngestion({ sourceIds, categories, limitPerCategory: limit });
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error) {
    console.error("Ingestion failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
