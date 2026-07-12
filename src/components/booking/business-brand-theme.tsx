import type { PublicBusiness } from "@/lib/booking";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BRAND_COLOR,
} from "@/lib/constants";

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function channelToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

/** Blend two hex colors; `tintWeight` is how much of `tint` to mix in (0–1). */
export function mixHexColor(base: string, tint: string, tintWeight: number): string {
  const baseRgb = parseHexColor(base);
  const tintRgb = parseHexColor(tint);
  if (!baseRgb || !tintRgb) return base;

  const t = Math.max(0, Math.min(1, tintWeight));
  const mix = (a: number, b: number) => a + (b - a) * t;

  return `#${channelToHex(mix(baseRgb.r, tintRgb.r))}${channelToHex(
    mix(baseRgb.g, tintRgb.g)
  )}${channelToHex(mix(baseRgb.b, tintRgb.b))}`;
}

/** Pick readable text on top of the brand accent */
export function accentForeground(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return "#0a0a0a";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#0a0a0a" : "#fafafa";
}

function buildBookingThemeVars(
  brandColor: string,
  backgroundColor: string = DEFAULT_BACKGROUND_COLOR
) {
  const accent = brandColor || DEFAULT_BRAND_COLOR;
  const accentFg = accentForeground(accent);
  const bookingBg = backgroundColor || DEFAULT_BACKGROUND_COLOR;

  return {
    accent,
    accentFg,
    bookingBg,
    bookingSurface: mixHexColor(bookingBg, accent, 0.14),
    bookingElevated: mixHexColor(bookingBg, accent, 0.22),
  };
}

/** Customer booking palette (not applied to the admin dashboard shell). */
export function BusinessBrandTheme({
  business,
}: {
  business: Pick<PublicBusiness, "brand_color" | "background_color">;
}) {
  const theme = buildBookingThemeVars(
    business.brand_color,
    business.background_color
  );

  return (
    <style>{`
      .booking-theme:not(.admin-app-shell) {
        --color-booking-accent: ${theme.accent};
        --color-booking-accent-fg: ${theme.accentFg};
        --color-booking-bg: ${theme.bookingBg};
        --color-booking-surface: ${theme.bookingSurface};
        --color-booking-elevated: ${theme.bookingElevated};
        background: var(--color-booking-bg);
      }

      .admin-app-shell.booking-theme {
        --color-booking-accent: ${theme.accent};
        --color-booking-accent-fg: ${theme.accentFg};
      }
    `}</style>
  );
}
