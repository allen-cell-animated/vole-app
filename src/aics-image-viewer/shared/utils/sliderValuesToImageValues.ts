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

// Density and brightness are overloaded for the two supported rendering modes in the volume viewer.
// These formulae are somewhat ad-hoc based on what will subjectively look reasonable in the viewer, and should be considered tweakable.
// vole-core expects to see numbers from 0..1 for density, brightness, and alpha.
export const densitySliderToImageValue = (sliderValues: number): number => sliderValues / 100.0;

export const brightnessSliderToImageValue = (sliderValues: number): number => sliderValues / 100.0;

export const alphaSliderToImageValue = (sliderValues: number): number => 1 - sliderValues / 100.0;
