import { getDevDelay } from "./dev-delay";

type ProgressState = {
  visible: boolean;
  value: number;
};

type Listener = (state: ProgressState) => void;

let pending = 0;
let navPending = false;
let value = 0;
let visible = false;
let trickleTimer: ReturnType<typeof setInterval> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function emit() {
  const state = { visible, value };
  listeners.forEach((listener) => listener(state));
}

function stopTrickle() {
  if (trickleTimer) {
    clearInterval(trickleTimer);
    trickleTimer = null;
  }
}

function trickle() {
  stopTrickle();
  trickleTimer = setInterval(() => {
    if (value >= 0.92) return;
    value += Math.max(0.008, (0.92 - value) * 0.12);
    if (value > 0.92) value = 0.92;
    emit();
  }, 280);
}

export function subscribeProgress(listener: Listener) {
  listeners.add(listener);
  listener({ visible, value });
  return () => {
    listeners.delete(listener);
  };
}

export function startProgress() {
  if (typeof window === "undefined") return;
  pending += 1;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (pending === 1) {
    visible = true;
    value = 0.12;
    emit();
    trickle();
  }
}

export function doneProgress() {
  if (typeof window === "undefined") return;
  pending = Math.max(0, pending - 1);
  if (pending > 0) return;
  stopTrickle();
  value = 1;
  emit();
  hideTimer = setTimeout(() => {
    visible = false;
    value = 0;
    emit();
    hideTimer = null;
  }, 260);
}

/** Call before client navigations so the bar appears on click, not after the next page mounts. */
export function startNavigation() {
  if (typeof window === "undefined") return;
  if (navPending) return;
  navPending = true;
  startProgress();
}

export function finishNavigation() {
  if (typeof window === "undefined") return;
  if (!navPending) return;
  const delay = process.env.NODE_ENV === "development" ? getDevDelay() : null;
  const wait = delay?.enabled ? delay.seconds * 1000 : 0;
  window.setTimeout(() => {
    if (!navPending) return;
    navPending = false;
    doneProgress();
  }, wait);
}
