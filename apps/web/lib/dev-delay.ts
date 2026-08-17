const STORAGE_KEY = "dataroom-dev-delay";
export const DEV_DELAY_DEFAULT_SECONDS = 3;

export type DevDelayState = {
  enabled: boolean;
  seconds: number;
};

type Listener = (state: DevDelayState) => void;

const listeners = new Set<Listener>();

function clampSeconds(value: number) {
  if (!Number.isFinite(value)) return DEV_DELAY_DEFAULT_SECONDS;
  return Math.min(30, Math.max(1, Math.round(value)));
}

function fallback(): DevDelayState {
  return { enabled: false, seconds: DEV_DELAY_DEFAULT_SECONDS };
}

export function getDevDelay(): DevDelayState {
  if (typeof window === "undefined") {
    return fallback();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as Partial<DevDelayState>;
    return {
      enabled: Boolean(parsed.enabled),
      seconds: clampSeconds(Number(parsed.seconds)),
    };
  } catch {
    return fallback();
  }
}

export function setDevDelay(patch: Partial<DevDelayState>) {
  if (typeof window === "undefined") return;
  const current = getDevDelay();
  const next = {
    ...current,
    ...patch,
    seconds: clampSeconds(Number(patch.seconds ?? current.seconds)),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener(next));
}

export function subscribeDevDelay(listener: Listener) {
  listeners.add(listener);
  listener(getDevDelay());
  return () => {
    listeners.delete(listener);
  };
}

/** Waits when the debug toggle is on. */
export async function applyDevDelay() {
  if (typeof window === "undefined") return;
  const { enabled, seconds } = getDevDelay();
  if (!enabled) return;
  await new Promise((resolve) => setTimeout(resolve, clampSeconds(seconds) * 1000));
}
