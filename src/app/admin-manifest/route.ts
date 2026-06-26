import {
  ADMIN_MANIFEST_PATH,
  ADMIN_PWA_BACKGROUND_COLOR,
  ADMIN_PWA_DESCRIPTION,
  ADMIN_PWA_NAME,
  ADMIN_PWA_SHORT_NAME,
  ADMIN_PWA_THEME_COLOR,
} from "@/lib/pwa/constants";

function manifestForStartUrl(startUrl: string) {
  return {
    id: ADMIN_MANIFEST_PATH,
    name: ADMIN_PWA_NAME,
    short_name: ADMIN_PWA_SHORT_NAME,
    description: ADMIN_PWA_DESCRIPTION,
    start_url: startUrl,
    scope: "/",
    display: "standalone" as const,
    orientation: "portrait" as const,
    background_color: ADMIN_PWA_BACKGROUND_COLOR,
    theme_color: ADMIN_PWA_THEME_COLOR,
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business")?.trim();
  const startUrl =
    businessId && /^[0-9a-f-]{36}$/i.test(businessId)
      ? `/dashboard/${businessId}`
      : "/dashboard";

  return Response.json(manifestForStartUrl(startUrl), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
