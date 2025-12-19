export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function log2(value: number): number {
  return Math.log(value) / Math.log(2);
}

export function logBase(value: number, base: number): number {
  return Math.log(value) / Math.log(base);
}

