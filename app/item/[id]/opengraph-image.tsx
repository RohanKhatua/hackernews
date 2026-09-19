import { ImageResponse } from "next/og";
import { fetchStory, getStoryDomain } from "@/lib/hn";
import { SITE_NAME } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `Story discussion on ${SITE_NAME}`;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await fetchStory(Number(id));

  const title = story?.title ?? SITE_NAME;
  const domain = getStoryDomain(story?.url);
  const meta = [
    story?.score != null ? `${story.score} points` : null,
    story?.descendants != null ? `${story.descendants} comments` : null,
    domain,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          color: "#fafafa",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "30px",
            fontWeight: 700,
            color: "#fb923c",
          }}
        >
          <span>Hacker News</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span style={{ color: "#a1a1aa" }}>But Better</span>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 90 ? "52px" : "64px",
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {title.slice(0, 160)}
        </div>

        <div style={{ display: "flex", fontSize: "30px", color: "#a1a1aa" }}>
          {meta}
        </div>
      </div>
    ),
    size,
  );
}
