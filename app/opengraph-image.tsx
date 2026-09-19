import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "28px",
          background: "#09090b",
          color: "#fafafa",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "72px", fontWeight: 700 }}>
          Hacker News
          <span style={{ color: "#fb923c" }}>&nbsp;But Better</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "32px",
            color: "#a1a1aa",
            lineHeight: 1.4,
            maxWidth: "900px",
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    size,
  );
}
