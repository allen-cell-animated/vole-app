type ImageValues = {
  min: number;
  max: number;
  scale: number;
};

export const gammaSliderToImageValues = (sliderValues: [number, number, number]): ImageValues => {
  let min = Number(sliderValues[0]);
  let mid = Number(sliderValues[1]);
  let max = Number(sliderValues[2]);

  if (mid > max || mid < min) {
    mid = 0.5 * (min + max);
  }
  let div = 255;
  min /= div;
  max /= div;
  mid /= div;
  let diff = max - min;
  let x = (mid - min) / diff;
  let scale = 4 * x * x;
  if ((mid - 0.5) * (mid - 0.5) < 0.0005) {
    scale = 1.0;
  }
  return {
    min,
    max,
    scale,
  };
};

// Density and brightness were once overloaded for the two rendering modes in the volume viewer (raymarch & pathtrace).
// Now both work the same, and the mapping from slider values to numbers in vole-core is relatively straightforward.
// But the mapping can still be tweaked here in the future, should we want to.

/** vole-core expects a value from 0..1 for density. */
export const densitySliderToImageValue = (sliderValue: number): number => sliderValue / 100.0;

/** vole-core expects a value from 0..1 for brigness. */
export const brightnessSliderToImageValue = (sliderValue: number): number => sliderValue / 100.0;

/** vole-core expects a value from 0..1 for alpha, and its scale is inverted from the app's slider. */
export const alphaSliderToImageValue = (sliderValue: number): number => 1 - sliderValue / 100.0;
