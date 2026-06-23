import { BusinessRegisterView } from "@/components/booking/business-register-view";

export default async function BusinessRegisterByRefPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { ref } = await params;
  const sp = await searchParams;
  const basePath = `/book/${ref}`;

  return (
    <BusinessRegisterView
      bookingRef={ref}
      basePath={basePath}
      searchParams={sp}
    />
  );
}
