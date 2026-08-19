import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PdfDownloadLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} download className={cn("inline-flex items-center", className)}>
      {children}
    </a>
  );
}
