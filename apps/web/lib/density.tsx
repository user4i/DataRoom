"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Density = "minimal" | "compact" | "wide";

const STORAGE_KEY = "dataroom-density";

const DensityContext = createContext<{
  density: Density;
  setDensity: (value: Density) => void;
}>({
  density: "minimal",
  setDensity: () => undefined,
});

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>("minimal");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "minimal" || stored === "compact" || stored === "wide") setDensityState(stored);
  }, []);

  const setDensity = (value: Density) => {
    setDensityState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  return <DensityContext.Provider value={{ density, setDensity }}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  return useContext(DensityContext);
}

export function useDensityFlags() {
  const { density, setDensity } = useDensity();
  return {
    density,
    setDensity,
    wide: density === "wide",
    compact: density === "compact",
    minimal: density === "minimal",
    dense: density !== "wide",
  };
}
