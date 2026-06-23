import { ScheduleWizard } from "@/components/booking/schedule-wizard";

export default async function ScheduleByRefPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{
    service?: string;
    date?: string;
    success?: string;
    error?: string;
    time?: string;
  }>;
}) {
  const { ref } = await params;
  const sp = await searchParams;
  const basePath = `/book/${ref}`;
  const flowPath = `${basePath}/schedule`;

  return (
    <ScheduleWizard
      bookingRef={ref}
      flowPath={flowPath}
      backPath={basePath}
      searchParams={sp}
    />
  );
}
