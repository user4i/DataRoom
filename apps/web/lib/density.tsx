"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Density = "compact" | "wide";

const STORAGE_KEY = "dataroom-density";

const DensityContext = createContext<{
  density: Density;
  setDensity: (value: Density) => void;
}>({
  density: "compact",
  setDensity: () => undefined,
});

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>("compact");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "compact" || stored === "wide") setDensityState(stored);
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
