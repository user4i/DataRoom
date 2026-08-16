"use client";

import { AuthProvider } from "@/lib/auth";
import { DensityProvider } from "@/lib/density";
import { ThemeProvider } from "@/lib/theme";
import { RouteProgress } from "@/components/route-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DensityProvider>
          {children}
          <RouteProgress />
        </DensityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
