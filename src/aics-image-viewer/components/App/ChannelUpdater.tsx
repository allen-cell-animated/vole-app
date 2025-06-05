import { Lut, View3d, Volume } from "@aics/vole-core";
import React, { useEffect } from "react";

import { controlPointsToLut, rampToControlPoints } from "../../shared/utils/controlPointsToLut";
import { ChannelState } from "../ViewerStateProvider/types";
import { UseImageEffectType } from "./types";

interface ChannelUpdaterProps {
  index: number;
  channelState: ChannelState;
  view3d: View3d;
  image: Volume | null;
  version: number;
}

/**
 * A component that doesn't render anything, but reacts to the provided `ChannelState`
 * and keeps it in sync with the viewer.
 */
const ChannelUpdater: React.FC<ChannelUpdaterProps> = ({ index, channelState, view3d, image, version }) => {
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
      view3d.setVolumeChannelEnabled(image, index, volumeEnabled);
      view3d.updateLuts(image);
    }
  }, [image, volumeEnabled, index, view3d]);

  useEffect(() => {
    if (image) {
      view3d.setVolumeChannelOptions(image, index, { isosurfaceEnabled });
    }
  }, [image, isosurfaceEnabled, index, view3d]);

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
      view3d.setVolumeChannelOptions(currentImage, index, { color });
      view3d.updateLuts(currentImage);
    },
    [color, index, view3d]
  );

  const { controlPoints, ramp, useControlPoints } = channelState;
  useImageEffect(
    (currentImage) => {
      if (useControlPoints && controlPoints.length < 2) {
        return;
      }
      const controlPointsToUse = useControlPoints ? controlPoints : rampToControlPoints(ramp);
      const gradient = controlPointsToLut(controlPointsToUse);
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
