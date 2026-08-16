import * as React from "react";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("shrink-0 bg-border h-px w-full", className)} {...props} />
  ),
);
Separator.displayName = "Separator";

export { Separator };
