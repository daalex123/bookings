import { ImageResponse } from "next/og";
import { appIconElement } from "@/lib/pwa/app-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(appIconElement({ fontSize: 20 }), { ...size });
}
