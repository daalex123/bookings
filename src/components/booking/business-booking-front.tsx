import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/booking-data";
import {
  bookingFlowPath,
  bookingPublicUrl,
} from "@/lib/booking";
import { getSiteUrl } from "@/lib/site-url";
import { ServiceList } from "@/components/booking/service-list";
import { ShareBookingCard } from "@/components/booking/share-booking-card";

export async function BusinessBookingFront({
  bookingRef,
  basePath,
}: {
  bookingRef: string;
  basePath: string;
}) {
  const [ctx, siteUrl] = await Promise.all([
    getPublicBusiness(bookingRef),
    getSiteUrl(),
  ]);

  if (!ctx) notFound();

  const { business, services } = ctx;

  const shareUrl = bookingPublicUrl(business.slug, siteUrl);
  const heroStyle = business.cover_image_url
    ? {
        backgroundImage: `linear-gradient(to top, rgba(10,10,10,0.92), rgba(10,10,10,0.45)), url(${business.cover_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="pb-6">
        <section
          className="relative mx-5 mt-6 overflow-hidden rounded-3xl booking-glass-hero booking-hero-gradient p-6 min-h-[200px] lg:mx-0 lg:mt-8 lg:min-h-[260px] lg:p-8"
          style={heroStyle}
        >
          <div className="relative z-10 flex h-full min-h-[160px] flex-col justify-end lg:min-h-[200px] lg:max-w-2xl">
            {business.logo_url && (
              <div className="mb-4 relative h-14 w-14 overflow-hidden rounded-2xl booking-glass-avatar">
                <Image
                  src={business.logo_url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <p className="text-2xl font-bold leading-tight lg:text-3xl">{business.name}</p>
            {business.tagline && (
              <p className="mt-1 text-sm font-medium text-booking-accent">
                {business.tagline}
              </p>
            )}
            <p className="mt-2 max-w-[280px] text-sm text-white/70 lg:max-w-xl lg:text-base">
              {business.description ||
                "Quality services — book your appointment in seconds."}
            </p>
            <Link
              href={bookingFlowPath(basePath)}
              className="mt-4 inline-flex w-fit rounded-full bg-booking-accent px-5 py-2.5 text-sm font-semibold text-booking-accent-fg"
            >
              Book Now
            </Link>
          </div>
          {!business.cover_image_url && (
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-booking-accent/10 blur-2xl" />
          )}
        </section>

        {services.length > 0 ? (
          <ServiceList
            services={services}
            basePath={basePath}
            currency={business.currency}
          />
        ) : (
          <p className="px-5 py-12 text-center text-booking-muted">
            No services available yet.
          </p>
        )}

        <div className="mt-5 px-5">
          <ShareBookingCard
            url={shareUrl}
            title="Share with friends"
            description="Scan or share this page so others can book at this business."
            variant="dark"
            compact
          />
        </div>
      </div>
  );
}
