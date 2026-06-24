import { ImageResponse } from "next/og";
import { appIconElement } from "@/lib/pwa/app-icon";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(appIconElement({ maskable: true, fontSize: 220 }), {
    width: 512,
    height: 512,
  });
}
