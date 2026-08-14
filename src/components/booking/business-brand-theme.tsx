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

  const accentLight = mixHexColor(accent, "#ffffff", 0.28);

  return {
    accent,
    accentFg,
    accentLight,
    bookingBg,
    bookingSurface: mixHexColor(bookingBg, accent, 0.14),
    bookingElevated: mixHexColor(bookingBg, accent, 0.22),
    glassBg: `color-mix(in srgb, ${accent} 6%, rgba(255, 255, 255, 0.05))`,
    glassBgElevated: `color-mix(in srgb, ${accent} 10%, rgba(255, 255, 255, 0.08))`,
    glassBgStrong: `color-mix(in srgb, ${accent} 14%, rgba(255, 255, 255, 0.12))`,
    glassBorder: `color-mix(in srgb, ${accent} 8%, rgba(255, 255, 255, 0.12))`,
    glassBorderStrong: `color-mix(in srgb, ${accent} 12%, rgba(255, 255, 255, 0.18))`,
  };
}

/** Applies the business brand color to customer and admin accent tokens. */
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
        --booking-glass-bg: ${theme.glassBg};
        --booking-glass-bg-elevated: ${theme.glassBgElevated};
        --booking-glass-bg-strong: ${theme.glassBgStrong};
        --booking-glass-border: ${theme.glassBorder};
        --booking-glass-border-strong: ${theme.glassBorderStrong};
        --admin-accent: ${theme.accent};
        --admin-accent-fg: ${theme.accentFg};
        background: var(--color-booking-bg);
      }

      .admin-app-shell.booking-theme {
        --color-booking-accent: ${theme.accent};
        --color-booking-accent-fg: ${theme.accentFg};
        --admin-accent: ${theme.accent};
        --admin-accent-fg: ${theme.accentFg};
        --admin-accent-light: ${theme.accentLight};
        --admin-accent-bg: color-mix(in srgb, ${theme.accent} 14%, transparent);
        --admin-gradient: linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentLight} 100%);
        --admin-gradient-subtle: linear-gradient(
          135deg,
          color-mix(in srgb, ${theme.accent} 14%, transparent) 0%,
          color-mix(in srgb, ${theme.accent} 6%, transparent) 100%
        );
      }
    `}</style>
  );
}
