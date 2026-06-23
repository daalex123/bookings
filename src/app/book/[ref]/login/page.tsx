import { BusinessLoginView } from "@/components/booking/business-login-view";

export default async function BusinessLoginByRefPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{
    redirect?: string;
    registered?: string;
    confirmEmail?: string;
    error?: string;
  }>;
}) {
  const { ref } = await params;
  const sp = await searchParams;
  const basePath = `/book/${ref}`;

  return (
    <BusinessLoginView bookingRef={ref} basePath={basePath} searchParams={sp} />
  );
}
