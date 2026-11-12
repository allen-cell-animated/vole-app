export function getFrameCount(min: number, max: number, frameIncrement: number): number {
  return Math.max(Math.ceil(((max ?? 1) - min + 1) / frameIncrement), 1);
}

/**
 * Returns a human-readable duration label in the format "MM min, SS sec".
 */
export const getDurationLabel = (totalSeconds: number): string => {
  const durationMin = Math.floor(totalSeconds / 60);
  const durationSec = totalSeconds - durationMin * 60;

  let timestamp = "";
  if (durationMin > 0) {
    timestamp += durationMin.toString() + " min, ";
  }
  // Format seconds to hundredths if less than 10 seconds
  if (durationMin === 0 && durationSec < 10) {
    // Round digits to 2 decimal places
    const roundedSeconds = Math.round(durationSec * 100) / 100;
    timestamp += roundedSeconds.toFixed(2) + " sec";
  } else {
    timestamp += Math.floor(durationSec).toString() + " sec";
  }
  return timestamp;
};

/** Returns a (heavily-approximated) file size in megabytes (MB) for a video. */
export const getApproximateVideoFilesizeMb = (
  totalSeconds: number,
  videoBitsPerSecond: number,
  exportDimensions: [number, number],
  numFrames: number
): string => {
  // From experimentation, filesize scales linearly (ish) with the
  // bitrate and duration unless a maximum filesize is hit at high
  // bitrates, which seems to depend on the video dimensions.

  // Video quality is bitrate in bits/second.
  // This is usually within 0.5-2x the actual filesize.
  const maxVideoBitsDuration = totalSeconds * videoBitsPerSecond;

  // Experimentally-determined compression ratio (bits per pixel), which determines
  // maximum size a video can be at very high bitrates. This may vary WILDLY based
  // on image complexity (videos with little change will compress better).
  // This is here because otherwise the filesize estimate is way too high for high bitrates
  // (475 MB predicted vs. 70 MB actual)
  // TODO: Is there a way to concretely determine this?
  const compressionRatioBitsPerPixel = 3.5; // Actual value 2.7-3.0, overshooting to be safe
  const maxVideoBitsResolution = exportDimensions[0] * exportDimensions[1] * numFrames * compressionRatioBitsPerPixel;

  const sizeInMb = Math.min(maxVideoBitsResolution, maxVideoBitsDuration) / 8_000_000; // bits to MB

  if (sizeInMb > 1) {
    return Math.round(sizeInMb) + " MB";
  } else {
    // Round to one decimal place, with a minimum of 0.1 MB. (We don't need to be too precise
    // because these are estimates.)
    return Math.max(1, Math.round(sizeInMb * 10)) / 10 + " MB";
  }
};

export function getExportDimensions(dimensionsInput: [number, number], enforceEvenDims: boolean): [number, number] {
  let targetViewportDims;
  if (enforceEvenDims) {
    targetViewportDims = dimensionsInput.map((value) => Math.round(value / 2) * 2) as [number, number];
  } else {
    targetViewportDims = dimensionsInput.map((value) => Math.round(value)) as [number, number];
  }

  return targetViewportDims;
}
