import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TechnicalTerm({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      dir="ltr"
      lang="en"
      className={cn(
        "inline-block font-latin font-medium",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
