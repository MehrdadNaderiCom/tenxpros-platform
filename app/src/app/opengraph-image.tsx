import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "TenXPros, a 100-day AI adoption journey for experienced professionals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#070B14",
          color: "#F8FAFC",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#4F46E5",
            borderRadius: 999,
            display: "flex",
            filter: "blur(90px)",
            height: 360,
            opacity: 0.24,
            position: "absolute",
            right: -80,
            top: -140,
            width: 360,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "72px 88px",
            width: "100%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex" }}>
            <div
              style={{
                alignItems: "center",
                background: "#1F4E79",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 18,
                display: "flex",
                fontSize: 27,
                fontWeight: 700,
                height: 72,
                justifyContent: "center",
                letterSpacing: -1,
                width: 72,
              }}
            >
              TXP
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                fontWeight: 650,
                marginLeft: 22,
              }}
            >
              TenXPros
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 700,
              letterSpacing: -2.5,
              lineHeight: 1.08,
              marginTop: 54,
              maxWidth: 940,
            }}
          >
            Lead AI adoption in your field.
          </div>
          <div
            style={{
              color: "#CBD5E1",
              display: "flex",
              fontSize: 27,
              lineHeight: 1.4,
              marginTop: 30,
            }}
          >
            100-day journey · 12-week guided learning path · Reviewed dossier
          </div>
          <div
            style={{
              background: "#C9A961",
              display: "flex",
              height: 4,
              marginTop: 55,
              width: 150,
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
