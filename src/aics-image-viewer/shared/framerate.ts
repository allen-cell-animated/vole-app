export function isValidFramerate(framerate: number): boolean {
  return Number.isFinite(framerate) && framerate > 0;
}
