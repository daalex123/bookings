import type { PublicBusiness } from "@/lib/booking";

/** Applies per-business accent color on the booking experience */
export function BusinessBrandTheme({ business }: { business: PublicBusiness }) {
  const accent = business.brand_color || "#f5c518";

  return (
    <style>{`
      :root {
        --booking-accent: ${accent};
        --booking-accent-fg: #0a0a0a;
      }
    `}</style>
  );
}
