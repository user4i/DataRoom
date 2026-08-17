import type { CSSProperties } from "react";

export const DEFAULT_LABEL_COLOR = "#64748b";

export function normalizeHex(color?: string | null) {
  const value = color?.trim() ?? "";
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toLowerCase() : DEFAULT_LABEL_COLOR;
}

export function contrastText(color?: string | null) {
  const hex = normalizeHex(color).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#111827" : "#ffffff";
}

export function labelChipStyle(color?: string | null, active = true): CSSProperties {
  const bg = normalizeHex(color);
  if (!active) {
    return {
      backgroundColor: `${bg}1a`,
      borderColor: bg,
      color: bg,
    };
  }
  return {
    backgroundColor: bg,
    borderColor: bg,
    color: contrastText(bg),
  };
}
