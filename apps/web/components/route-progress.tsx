"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { finishNavigation, startNavigation, subscribeProgress } from "@/lib/progress";

function isInternalNav(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

const INTENSITY_MS = 2500;

export function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState({ visible: false, value: 0 });
  const [intensity, setIntensity] = useState(0);

  useEffect(() => subscribeProgress(setState), []);

  useEffect(() => {
    if (!state.visible) {
      setIntensity(0);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / INTENSITY_MS);
      setIntensity(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.visible]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || !isInternalNav(anchor)) return;
      startNavigation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => finishNavigation(), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const height = 2 + intensity * 2;
  const opacity = state.visible ? 0.5 + intensity * 0.5 : 0;
  const glow = 6 + intensity * 18;
  const glowAlpha = 0.28 + intensity * 0.5;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] overflow-visible"
      aria-hidden
      role="presentation"
    >
      <div
        className="origin-left bg-sky-400"
        style={{
          width: `${Math.round(state.value * 1000) / 10}%`,
          height: `${height}px`,
          opacity,
          boxShadow: state.visible ? `0 0 ${glow}px ${glow / 4}px rgb(56 189 248 / ${glowAlpha})` : undefined,
          transition: state.visible
            ? "width 280ms ease-out, opacity 180ms linear, height 280ms ease-out, box-shadow 280ms ease-out"
            : "width 0ms, opacity 180ms linear, height 180ms ease-out, box-shadow 180ms ease-out",
        }}
      />
    </div>
  );
}
