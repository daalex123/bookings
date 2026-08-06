import { cn } from "@/lib/utils";

export const bookingFormCardClass =
  "booking-glass-card rounded-3xl p-6";

export const bookingInputClass =
  "booking-glass-input w-full min-h-[48px] rounded-2xl px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-booking-accent focus:outline-none focus:ring-2 focus:ring-booking-accent/35 disabled:cursor-not-allowed disabled:opacity-60";

export const bookingGlassCardClass = "booking-glass-card";
export const bookingGlassClass = "booking-glass";
export const bookingGlassInputClass = "booking-glass-input";
export const bookingGlassPillClass = "booking-glass-pill";
export const bookingGlassAvatarClass = "booking-glass-avatar";
export const bookingGlassPanelClass = "booking-glass-panel";

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
