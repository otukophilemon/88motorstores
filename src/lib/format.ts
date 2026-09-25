export function kes(value: number): string {
  return `KSh ${Math.round(value).toLocaleString("en-KE")}`;
}

export function kesShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `KSh ${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (value >= 1_000) return `KSh ${Math.round(value / 1_000)}k`;
  return kes(value);
}

export function km(value: number): string {
  return `${Math.round(value).toLocaleString("en-KE")} km`;
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function yearNow(): number {
  return 2026;
}
