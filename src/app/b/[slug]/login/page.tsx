import { BusinessLoginView } from "@/components/booking/business-login-view";
import { bookingPagePathBySlug } from "@/lib/booking";

export default async function BusinessLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    redirect?: string;
    registered?: string;
    confirmEmail?: string;
    error?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const basePath = bookingPagePathBySlug(slug);

  return (
    <BusinessLoginView bookingRef={slug} basePath={basePath} searchParams={sp} />
  );
}
