import type { ReactElement } from "react";

type AppIconOptions = {
  maskable?: boolean;
  letter?: string;
  accent?: string;
  fontSize?: number;
};

/** Shared launcher icon markup for PNG generation (manifest / home screen). */
export function appIconElement({
  maskable = false,
  letter = "B",
  accent = "#f5c518",
  fontSize = 120,
}: AppIconOptions = {}): ReactElement {
  return (
    <div
      style={{
        background: "#0a0a0a",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: maskable ? "18%" : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
        }}
      >
        {letter}
      </div>
    </div>
  );
}
