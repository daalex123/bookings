import { ImageResponse } from "next/og";
import { appIconElement } from "@/lib/pwa/app-icon";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(appIconElement({ fontSize: 96 }), {
    width: 192,
    height: 192,
  });
}
