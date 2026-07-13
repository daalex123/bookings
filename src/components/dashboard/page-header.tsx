import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  className,
  action,
}: {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-white lg:text-[var(--admin-navy)] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-[13px] text-booking-muted lg:text-[var(--admin-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
