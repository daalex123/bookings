import { BusinessBookingFront } from "@/components/booking/business-booking-front";

export default async function BusinessByRefPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const basePath = `/book/${ref}`;
  return <BusinessBookingFront bookingRef={ref} basePath={basePath} />;
}
