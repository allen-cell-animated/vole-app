export function getFrameCount(min: number, max: number, frameIncrement: number): number {
  return Math.max(Math.ceil(((max ?? 1) - min + 1) / frameIncrement), 1);
}

export function getExportDimensions(dimensionsInput: [number, number], enforceEvenDims: boolean): [number, number] {
  let targetViewportDims;
  if (enforceEvenDims) {
    targetViewportDims = dimensionsInput.map((value) => Math.round(value / 2) * 2) as [number, number];
  } else {
    targetViewportDims = dimensionsInput.map((value) => Math.round(value)) as [number, number];
  }

  return targetViewportDims;
}
