"use client";

import { AiSummaryLocaleProvider } from "@/lib/ai-summary-locale";
import { AuthProvider } from "@/lib/auth";
import { DensityProvider } from "@/lib/density";
import { LocaleProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { RouteProgress } from "@/components/route-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <AuthProvider>
          <DensityProvider>
            <AiSummaryLocaleProvider>
              {children}
              <RouteProgress />
            </AiSummaryLocaleProvider>
          </DensityProvider>
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
