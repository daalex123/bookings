import { BusinessBookingFront } from "@/components/booking/business-booking-front";
import { bookingPagePathBySlug } from "@/lib/booking";

export default async function BusinessBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const basePath = bookingPagePathBySlug(slug);
  return <BusinessBookingFront bookingRef={slug} basePath={basePath} />;
}
