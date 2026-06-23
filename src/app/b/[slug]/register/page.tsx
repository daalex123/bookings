import { BusinessRegisterView } from "@/components/booking/business-register-view";
import { bookingPagePathBySlug } from "@/lib/booking";

export default async function BusinessRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const basePath = bookingPagePathBySlug(slug);

  return (
    <BusinessRegisterView
      bookingRef={slug}
      basePath={basePath}
      searchParams={sp}
    />
  );
}
