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

export function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState({ visible: false, value: 0 });

  useEffect(() => subscribeProgress(setState), []);

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

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden"
      aria-hidden
      role="presentation"
    >
      <div
        className="h-full origin-left bg-foreground/30"
        style={{
          width: `${Math.round(state.value * 1000) / 10}%`,
          opacity: state.visible ? 1 : 0,
          transition: state.visible
            ? "width 280ms ease-out, opacity 180ms linear"
            : "width 0ms, opacity 180ms linear",
        }}
      />
    </div>
  );
}
