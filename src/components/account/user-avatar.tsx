import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

const sizeClass = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-24 w-24 text-2xl",
} as const;

export function UserAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-[#f0f2f5] font-semibold text-[#1e2235]",
        sizeClass[size],
        className
      )}
    >
      {src ? (
        <Image src={src} alt="" fill className="object-cover" unoptimized />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {initials}
        </span>
      )}
    </div>
  );
}
