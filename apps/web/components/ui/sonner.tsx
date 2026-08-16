"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/theme";

type ToasterProps = ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();
  return <Sonner className="toaster group" theme={resolved === "dark" ? "dark" : "light"} {...props} />;
}
