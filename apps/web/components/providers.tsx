"use client";

import { AuthProvider } from "@/lib/auth";
import { DensityProvider } from "@/lib/density";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DensityProvider>{children}</DensityProvider>
    </AuthProvider>
  );
}
