export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const clamp01 = (value: number) => clamp(value, 0, 1);
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
export const damp = (from: number, to: number, lambda: number, dt: number) =>
  lerp(from, to, 1 - Math.exp(-lambda * dt));

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = clamp01((value - inMin) / (inMax - inMin));
  return lerp(outMin, outMax, t);
}
