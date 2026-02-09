import { Lut, type View3d, type Volume } from "@aics/vole-core";
import type React from "react";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

import { SINGLE_CHANNEL_MODE_COLOR } from "../../shared/constants";
import { binIndexedControlPointsToLut, rampToControlPoints } from "../../shared/utils/controlPointsToLut";
import { select, useViewerState, type ViewerStore } from "../../state/store";
import type { UseImageEffectType } from "./types";

interface ChannelUpdaterProps {
  index: number;
  view3d: View3d;
  image: Volume | null;
  version: number;
}

/**
 * A component that doesn't render anything, but reacts to the provided `ChannelState`
 * and keeps it in sync with the viewer.
 */
const ChannelUpdater: React.FC<ChannelUpdaterProps> = ({ index, view3d, image, version }) => {
  const channelStateSelector = useShallow((state: ViewerStore) => state.channelSettings[index]);
  const channelState = useViewerState(channelStateSelector);
  const singleChannelMode = useViewerState(select("singleChannelMode"));
  const singleChannelIndex = useViewerState(select("singleChannelIndex"));
  const { volumeEnabled, isosurfaceEnabled, isovalue, colorizeEnabled, colorizeAlpha, opacity, color } = channelState;

  // Effects to update channel settings should check if image is present and channel is loaded first
  const useImageEffect: UseImageEffectType = (effect, deps) => {
    useEffect(() => {
      if (image && version > 0) {
        return effect(image);
      }
      // react-hooks will check that `deps` match `effect`'s dependencies, so we can safely exclude `effect` here
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, image, version]);
  };

  // enable/disable channel can't be dependent on channel load state because it may trigger the channel to load
  useEffect(() => {
    if (image) {
      const enabled = singleChannelMode ? index === singleChannelIndex : volumeEnabled;
      view3d.setVolumeChannelEnabled(image, index, enabled);
      view3d.updateLuts(image);
    }
  }, [image, volumeEnabled, index, view3d, singleChannelMode, singleChannelIndex]);

  useEffect(() => {
    if (image) {
      const enabled = isosurfaceEnabled && !singleChannelMode;
      view3d.setVolumeChannelOptions(image, index, { isosurfaceEnabled: enabled });
    }
  }, [image, isosurfaceEnabled, index, view3d, singleChannelMode]);

  useImageEffect(
    (currentImage) => view3d.setVolumeChannelOptions(currentImage, index, { isovalue }),
    [isovalue, index, view3d]
  );

  useImageEffect(
    (currentImage) => view3d.setVolumeChannelOptions(currentImage, index, { isosurfaceOpacity: opacity }),
    [opacity, index, view3d]
  );

  useImageEffect(
    (currentImage) => {
      const finalColor = singleChannelMode ? SINGLE_CHANNEL_MODE_COLOR : color;
      view3d.setVolumeChannelOptions(currentImage, index, { color: finalColor });
      view3d.updateLuts(currentImage);
    },
    [color, index, view3d, singleChannelMode]
  );

  const { controlPoints, ramp, useControlPoints } = channelState;
  useImageEffect(
    (currentImage) => {
      if (useControlPoints && controlPoints.length < 2) {
        return;
      }
      const histogram = currentImage.getHistogram(index);
      const controlPointsToUse = useControlPoints ? controlPoints : rampToControlPoints(ramp);
      // Convert control points from raw intensity values to histogram bin indices
      const binIndexedControlPoints = controlPointsToUse.map((cp) => ({
        ...cp,
        x: histogram.findFractionalBinOfValue(cp.x),
      }));
      const gradient = binIndexedControlPointsToLut(binIndexedControlPoints);
      currentImage.setLut(index, gradient);
      view3d.updateLuts(currentImage);
    },
    [controlPoints, ramp, useControlPoints, index, view3d]
  );

  useImageEffect(
    (currentImage) => {
      if (colorizeEnabled) {
        // TODO get the labelColors from the tf editor component
        const lut = new Lut().createLabelColors(currentImage.getHistogram(index));
        currentImage.setColorPalette(index, lut.lut);
        // following effect will also run and call `updateLuts`
      }
    },
    [colorizeEnabled, index, view3d]
  );

  useImageEffect(
    (currentImage) => {
      currentImage.setColorPaletteAlpha(index, colorizeEnabled ? colorizeAlpha : 0);
      view3d.updateLuts(currentImage);
    },
    [colorizeEnabled, colorizeAlpha, index, view3d]
  );

  return null;
};

export default ChannelUpdater;
