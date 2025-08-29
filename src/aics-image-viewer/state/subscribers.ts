import { Lut, RENDERMODE_PATHTRACE, RENDERMODE_RAYMARCH, View3d, Volume } from "@aics/vole-core";
import { shallow } from "zustand/shallow";

import { RenderMode, ViewMode } from "../shared/enums";
import { activeAxisMap, type AxisName } from "../shared/types";
import { colorArrayToFloats } from "../shared/utils/colorRepresentations";
import { controlPointsToLut, rampToControlPoints } from "../shared/utils/controlPointsToLut";
import {
  alphaSliderToImageValue,
  brightnessSliderToImageValue,
  densitySliderToImageValue,
  gammaSliderToImageValues,
} from "../shared/utils/sliderValuesToImageValues";
import { select, type useViewerState, type ViewerStore } from "./store";
import { ChannelState } from "./types";

const REF_EQ = { fireImmediately: true };
const DEEP_EQ = { fireImmediately: true, equalityFn: shallow };

export const subscribeViewToState = (store: typeof useViewerState, view3d: View3d): (() => void) => {
  const unsubscribers = [
    // view mode
    store.subscribe(
      select("viewMode"),
      (viewMode) => {
        view3d.setCameraMode(viewMode);
        view3d.resize(null);
      },
      REF_EQ
    ),

    // camera state
    store.subscribe(
      select("cameraState"),
      (cameraState) => {
        if (cameraState) {
          view3d.setCameraState(cameraState);
        }
      },
      DEEP_EQ
    ),

    // autorotate
    store.subscribe(select("autorotate"), view3d.setAutoRotate.bind(view3d), REF_EQ),

    // show axes
    store.subscribe(select("showAxes"), view3d.setShowAxis.bind(view3d), REF_EQ),

    // background color
    store.subscribe(
      select("backgroundColor"),
      (backgroundColor) => view3d.setBackgroundColor(colorArrayToFloats(backgroundColor)),
      REF_EQ
    ),

    // brightness
    store.subscribe(
      select("brightness"),
      (brightness) => {
        view3d.updateExposure(brightnessSliderToImageValue(brightness));
      },
      REF_EQ
    ),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

type AxisClipUpdateInfo = {
  region: [number, number];
  slice: number;
  viewMode: ViewMode;
};

const selectAxisClipUpdateInfo = (axis: AxisName): ((store: ViewerStore) => AxisClipUpdateInfo) => {
  return ({ region, slice, viewMode }) => ({ region: region[axis], slice: slice[axis], viewMode });
};

export const subscribeImageToState = (store: typeof useViewerState, view3d: View3d, image: Volume): (() => void) => {
  const axisClipUpdater = (axis: AxisName) => {
    return ({ region: [minval, maxval], slice, viewMode }: AxisClipUpdateInfo) => {
      // Logic to determine axis clipping range, for each of x,y,z,3d slider:
      // if slider was same as active axis view mode:  [viewerSettings.slice[axis], viewerSettings.slice[axis] + 1.0/volumeSize[axis]]
      // if in 3d mode: viewerSettings.region[axis]
      // else: [0,1]
      let isOrthoAxis = false;
      let axismin = 0.0;
      let axismax = 1.0;
      if (viewMode === ViewMode.threeD) {
        axismin = minval;
        axismax = maxval;
      } else {
        isOrthoAxis = activeAxisMap[viewMode] === axis;
        const oneSlice = 1 / image.imageInfo.volumeSize[axis];
        axismin = isOrthoAxis ? slice : 0.0;
        axismax = isOrthoAxis ? slice + oneSlice : 1.0;
        if (axis === "z" && viewMode === ViewMode.xy) {
          view3d.setZSlice(image, Math.floor(slice * image.imageInfo.volumeSize.z));
        }
      }

      // view3d wants the coordinates in the -0.5 to 0.5 range
      view3d.setAxisClip(image, axis, axismin - 0.5, axismax - 0.5, isOrthoAxis);
      // TODO necessary?
      // view3d.setCameraMode(viewMode);
      // TODO under some circumstances, this effect will trigger a load. Ideally, this would be reflected in the load
      //   state managed by `useVolume`. This is complicated by the fact that the relevant methods (`setAxisClip` and
      //   `setZSlice`) don't provide a channel load callback like other load-triggering methods (e.g. `setTime`).
    };
  };

  const unsubscribers = [
    // show bounding box
    store.subscribe(
      select("showBoundingBox"),
      (showBoundingBox) => view3d.setShowBoundingBox(image, showBoundingBox),
      REF_EQ
    ),

    // bounding box color
    store.subscribe(
      select("boundingBoxColor"),
      (boundingBoxColor) => view3d.setBoundingBoxColor(image, boundingBoxColor),
      REF_EQ
    ),

    // render mode
    store.subscribe(
      select("renderMode"),
      (renderMode) => {
        view3d.setMaxProjectMode(image, renderMode === RenderMode.maxProject);
        view3d.setVolumeRenderMode(renderMode === RenderMode.pathTrace ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
        view3d.updateActiveChannels(image);
      },
      REF_EQ
    ),

    // mask alpha
    store.subscribe(
      select("maskAlpha"),
      (maskAlpha) => {
        view3d.updateMaskAlpha(image, alphaSliderToImageValue(maskAlpha));
        view3d.updateActiveChannels(image);
      },
      REF_EQ
    ),

    // density
    store.subscribe(
      select("density"),
      (density) => view3d.updateDensity(image, densitySliderToImageValue(density)),
      REF_EQ
    ),

    // gamma
    store.subscribe(
      select("levels"),
      (levels) => {
        const { min, max, scale } = gammaSliderToImageValues(levels);
        view3d.setGamma(image, min, max, scale);
      },
      REF_EQ
    ),

    // interpolation
    store.subscribe(
      select("interpolationEnabled"),
      (enabled) => view3d.setInterpolationEnabled(image, enabled),
      REF_EQ
    ),

    // clipping
    store.subscribe(selectAxisClipUpdateInfo("x"), axisClipUpdater("x"), DEEP_EQ),
    store.subscribe(selectAxisClipUpdateInfo("y"), axisClipUpdater("y"), DEEP_EQ),
    store.subscribe(selectAxisClipUpdateInfo("z"), axisClipUpdater("z"), DEEP_EQ),

    // TODO reset channels, time, scene?
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export const subscribeChannelToState = (
  store: typeof useViewerState,
  view3d: View3d,
  image: Volume,
  index: number
): (() => void) => {
  const subscribeChannel = <T>(selector: (settings: ChannelState) => T, handler: (value: T) => void): (() => void) => {
    return store.subscribe(
      (store): [number, T] => [store.channelVersions[index], selector(store.channelSettings[index])],
      ([version, value]) => {
        if (version > 0) {
          handler(value);
        }
      },
      DEEP_EQ
    );
  };

  const unsubscribers = [
    subscribeChannel(select("volumeEnabled"), (volumeEnabled) => {
      view3d.setVolumeChannelEnabled(image, index, volumeEnabled);
      view3d.updateLuts(image);
    }),

    subscribeChannel(select("isosurfaceEnabled"), (isosurfaceEnabled) => {
      view3d.setVolumeChannelOptions(image, index, { isosurfaceEnabled });
    }),

    subscribeChannel(select("isovalue"), (isovalue) => view3d.setVolumeChannelOptions(image, index, { isovalue })),

    subscribeChannel(select("opacity"), (isosurfaceOpacity) => {
      view3d.setVolumeChannelOptions(image, index, { isosurfaceOpacity });
    }),

    subscribeChannel(select("color"), (color) => {
      view3d.setVolumeChannelOptions(image, index, { color });
      view3d.updateLuts(image);
    }),

    subscribeChannel(
      ({ controlPoints, ramp, useControlPoints }) => ({ controlPoints, ramp, useControlPoints }),
      ({ controlPoints, ramp, useControlPoints }) => {
        if (useControlPoints && controlPoints.length < 2) {
          return;
        }

        const controlPointsToUse = useControlPoints ? controlPoints : rampToControlPoints(ramp);
        const gradient = controlPointsToLut(controlPointsToUse);
        image.setLut(index, gradient);
        view3d.updateLuts(image);
      }
    ),

    subscribeChannel(select("colorizeEnabled"), (colorizeEnabled) => {
      if (colorizeEnabled) {
        // TODO get the labelColors from the tf editor component
        const lut = new Lut().createLabelColors(image.getHistogram(index));
        image.setColorPalette(index, lut.lut);
        // following subscriber will also run and call `updateLuts`
      }
    }),

    subscribeChannel(
      ({ colorizeEnabled, colorizeAlpha }) => ({ colorizeEnabled, colorizeAlpha }),
      ({ colorizeEnabled, colorizeAlpha }) => {
        image.setColorPaletteAlpha(index, colorizeEnabled ? colorizeAlpha : 0);
        view3d.updateLuts(image);
      }
    ),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export const subscribeChannelsToState = (
  store: typeof useViewerState,
  view3d: View3d,
  image: Volume,
  numChannels: number
): (() => void) => {
  const unsubscribers: (() => void)[] = [];

  for (let i = 0; i < numChannels; i++) {
    unsubscribers.push(subscribeChannelToState(store, view3d, image, i));
  }

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};
