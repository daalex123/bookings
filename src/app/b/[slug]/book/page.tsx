import { ScheduleWizard } from "@/components/booking/schedule-wizard";
import { bookingFlowPath, bookingPagePathBySlug } from "@/lib/booking";

export default async function BusinessBookBySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    service?: string;
    date?: string;
    success?: string;
    error?: string;
    time?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const basePath = bookingPagePathBySlug(slug);

  return (
    <ScheduleWizard
      bookingRef={slug}
      flowPath={bookingFlowPath(basePath)}
      backPath={basePath}
      searchParams={sp}
    />
  );
}
