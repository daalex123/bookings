import type { PublicBusiness } from "@/lib/booking";

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/** Pick readable text on top of the brand accent */
export function accentForeground(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return "#0a0a0a";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#0a0a0a" : "#fafafa";
}

/** Applies per-business accent color on the booking experience */
export function BusinessBrandTheme({ business }: { business: PublicBusiness }) {
  const accent = business.brand_color || "#f5c518";
  const accentFg = accentForeground(accent);

  return (
    <style>{`
      .booking-theme {
        --color-booking-accent: ${accent};
        --color-booking-accent-fg: ${accentFg};
      }
    `}</style>
  );
}
