import { cn } from "@/lib/utils";

export const bookingFormCardClass =
  "rounded-3xl border border-white/10 bg-booking-surface p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)]";

export const bookingInputClass =
  "w-full min-h-[48px] rounded-2xl border border-white/15 bg-booking-bg px-4 py-3 text-base text-white shadow-inner shadow-black/20 placeholder:text-white/35 focus:border-booking-accent focus:outline-none focus:ring-2 focus:ring-booking-accent/35 disabled:cursor-not-allowed disabled:opacity-60";

export const bookingLabelClass = "text-sm font-medium text-white/85";

type BookingFormFieldProps = {
  label: string;
  id: string;
  className?: string;
} & React.ComponentProps<"input">;

export function BookingFormField({
  label,
  id,
  className,
  ...props
}: BookingFormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={bookingLabelClass}>
        {label}
      </label>
      <input id={id} className={cn(bookingInputClass, className)} {...props} />
    </div>
  );
}
