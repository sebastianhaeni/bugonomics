export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function ratioByLog(value, pivot) {
  const safeValue = Math.max(0, Number(value) || 0);
  const safePivot = Math.max(1, Number(pivot) || 1);
  return clamp01(Math.log10(1 + safeValue) / Math.log10(1 + safePivot));
}
