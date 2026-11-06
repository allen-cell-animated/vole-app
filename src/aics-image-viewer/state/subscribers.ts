import { RENDERMODE_PATHTRACE, RENDERMODE_RAYMARCH, type AxisName as VCAxisName, type View3d, type Volume } from "@aics/vole-core";
import { shallow } from "zustand/shallow";

import { activeAxisMap, type AxisName, type XYZ } from "../shared/types";
import { colorArrayToFloats } from "../shared/utils/colorRepresentations";
import {
  alphaSliderToImageValue,
  brightnessSliderToImageValue,
  densitySliderToImageValue,
  gammaSliderToImageValues,
} from "../shared/utils/sliderValuesToImageValues";
import { select, type useViewerState, type ViewerStore } from "./store";
import { RenderMode, ViewMode } from "./types";

const AXES: AxisName[] = ["x", "y", "z"];

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

/**
 * Converts a normalized slice position in `[0, 1]` to a voxel index in `image`'s currently loaded scale level.
 *
 * Each axis is converted against its own `volumeSize`, so this holds whatever a level does to that axis -
 * downsampled by any factor, or left alone. Slice state is stored normalized for exactly this reason:
 * `volumeSize` describes the *loaded multiscale level*, not the image.
 *
 * The result is clamped so it is a valid index for any axis size, including an axis a deep level has
 * reduced to a single voxel (where every position maps to index 0).
 */
const sliceToVoxelIndex = (image: Volume, axis: AxisName, slice: number): number => {
  const axisSize = image.imageInfo.volumeSize[axis];
  return Math.min(Math.max(Math.round(slice * axisSize), 0), Math.max(axisSize - 1, 0));
};

/**
 * Pushes all three triple-view slice positions into `view3d` as voxel indices.
 *
 * `view3d` holds these as indices into the loaded scale level, so they must be re-asserted whenever that
 * level changes under us - see the corresponding effect in `App`. All three axes are rewritten rather than
 * just the ones whose size changed, since a level may resize any subset of them.
 */
export const applyTripleSliceIndices = (view3d: View3d, image: Volume, slice: XYZ<number>): void => {
  for (const axis of AXES) {
    view3d.setTripleSliceIndex(axis as VCAxisName, sliceToVoxelIndex(image, axis, slice[axis]));
  }
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
      if (viewMode === ViewMode.tripleProj) {
        view3d.setTripleSliceIndex(axis as VCAxisName, sliceToVoxelIndex(image, axis, slice));
        return;
      }
      let isOrthoAxis = false;
      let axismin = 0.0;
      let axismax = 1.0;
      if (viewMode === ViewMode.threeD) {
        // 3d mode: just use the region from state
        axismin = minval;
        axismax = maxval;
      } else {
        // 2d mode: if this is the looked-down axis...
        if (activeAxisMap[viewMode] === axis) {
          // ...show a one-slice region around `slice`
          const oneSlice = 1 / image.imageInfo.volumeSize[axis];
          axismin = slice;
          axismax = slice + oneSlice;
        } else {
          // ...otherwise, reset to [0, 1] - we probably just changed `viewMode` to 2d and want to see the whole slice
          axismin = 0.0;
          axismax = 1.0;
        }

        // also, "look down z" has a special mode with its own special setting
        if (axis === "z" && viewMode === ViewMode.xy) {
          view3d.setZSlice(image, Math.floor(slice * image.imageInfo.volumeSize.z));
        }
      }

      // view3d wants the coordinates in the -0.5 to 0.5 range
      view3d.setAxisClip(image, axis as VCAxisName, axismin - 0.5, axismax - 0.5, isOrthoAxis);
      // TODO necessary?
      // view3d.setCameraMode(viewMode);
      // TODO under some circumstances, this effect will trigger a load. Ideally, this would be reflected in the load
      //   state managed by `useVolume`. This is complicated by the fact that the relevant methods (`setAxisClip` and
      //   `setZSlice`) don't provide a channel load callback like other load-triggering methods (e.g. `setTime`).
    };
  };

  const unsubscribers = [
    // Reset axis clips to full range when entering triple projection mode.
    // TripleSliceVolume is constructed with the current settings (which may have tight 2D clips),
    // so we clear them here so all three panes can see the full volume extent.
    store.subscribe(
      select("viewMode"),
      (viewMode) => {
        if (viewMode === ViewMode.tripleProj) {
          AXES.forEach((axis) => {
            view3d.setAxisClip(image, axis as VCAxisName, -0.5, 0.5, false);
          });
        }
      },
      REF_EQ
    ),

    // show bounding box
    store.subscribe(
      select("showBoundingBox"),
      (showBoundingBox) => view3d.setShowBoundingBox(image, showBoundingBox),
      REF_EQ
    ),

    // bounding box color
    store.subscribe(
      select("boundingBoxColor"),
      (boundingBoxColor) => view3d.setBoundingBoxColor(image, colorArrayToFloats(boundingBoxColor)),
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

    store.subscribe(
      ({ useExactScaleLevel, scaleLevelIndex }) => ({ useExactScaleLevel, scaleLevelIndex }),
      ({ useExactScaleLevel, scaleLevelIndex }) => {
        if (useExactScaleLevel) {
          image.updateRequiredData({ useExplicitLevel: true, multiscaleLevel: scaleLevelIndex });
        } else {
          image.updateRequiredData({ useExplicitLevel: false, multiscaleLevel: undefined });
        }
      },
      DEEP_EQ
    ),

    // clipping
    store.subscribe(selectAxisClipUpdateInfo("x"), axisClipUpdater("x"), DEEP_EQ),
    store.subscribe(selectAxisClipUpdateInfo("y"), axisClipUpdater("y"), DEEP_EQ),
    store.subscribe(selectAxisClipUpdateInfo("z"), axisClipUpdater("z"), DEEP_EQ),

    // TODO reset channels, time, scene?
  ];

  // Update state when the user drags crosshairs in triple-slice mode.
  // vole-core only fires this callback during triple-slice rendering so it is safe to register unconditionally.
  view3d.setTripleSliceCallback((indices) => {
    const { x, y, z } = image.imageInfo.volumeSize;
    store.getState().changeViewerSetting("slice", {
      x: indices.x / x,
      y: indices.y / y,
      z: indices.z / z,
    });
  });

  return () => {
    view3d.setTripleSliceCallback(null);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};
