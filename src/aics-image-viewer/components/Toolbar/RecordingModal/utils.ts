export function getFrameCount(min: number, max: number, frameIncrement: number): number {
  return Math.max(Math.ceil(((max ?? 1) - min + 1) / frameIncrement), 1);
}
