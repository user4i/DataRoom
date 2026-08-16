"use client";

import { AuthProvider } from "@/lib/auth";
import { DensityProvider } from "@/lib/density";
import { RouteProgress } from "@/components/route-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DensityProvider>
        {children}
        <RouteProgress />
      </DensityProvider>
    </AuthProvider>
  );
}
