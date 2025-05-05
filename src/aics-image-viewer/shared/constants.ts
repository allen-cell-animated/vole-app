import type { CameraState, Channel } from "@aics/vole-core";

import { ChannelState, ViewerState } from "../components/ViewerStateProvider/types";
import { ImageType, RenderMode, ViewMode } from "./enums";
import { ColorArray } from "./utils/colorRepresentations";
import { ViewerChannelSettings } from "./utils/viewerChannelSettings";

// Add all exported constants here to prevent circular dependencies
export const // Control panel will automatically close if viewport is less than this width
  CONTROL_PANEL_CLOSE_WIDTH = 970,
  CLIPPING_PANEL_HEIGHT_DEFAULT = 200,
  CLIPPING_PANEL_HEIGHT_TALL = 235,
  BACKGROUND_COLOR_DEFAULT: ColorArray = [0, 0, 0],
  BOUNDING_BOX_COLOR_DEFAULT: ColorArray = [255, 255, 255],
  AXIS_MARGIN_DEFAULT: [number, number] = [16, 16],
  SCALE_BAR_MARGIN_DEFAULT: [number, number] = [120, 12],
  // These settings were chosen to work well with most AICS microscopy pipeline images.
  // These numbers mean: remap the bottom LUT_MIN_PERCENTILE fraction of pixels to zero intensity,
  // and linearly increase intensity up to the LUT_MAX_PERCENTILE fraction of pixels.
  LUT_MIN_PERCENTILE = 0.5,
  LUT_MAX_PERCENTILE = 0.983,
  ISOSURFACE_OPACITY_SLIDER_MAX = 255.0,
  ALPHA_MASK_SLIDER_DEFAULT = 0,
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT = 70,
  DENSITY_SLIDER_LEVEL_DEFAULT = 50,
  LEVELS_SLIDER_DEFAULT: ColorArray = [35.0, 140.0, 255.0],
  INTERPOLATION_ENABLED_DEFAULT = true,
  OTHER_CHANNEL_KEY = "Other",
  SINGLE_GROUP_CHANNEL_KEY = "Channels";

export const TFEDITOR_DEFAULT_COLOR: ColorArray = [255, 255, 255];
export const TFEDITOR_MAX_BIN = 255;

export const CACHE_MAX_SIZE = 1_000_000_000;
export const QUEUE_MAX_SIZE = 10;
export const QUEUE_MAX_LOW_PRIORITY_SIZE = 4;

/** Maps channel data types to their minimum and maximum values */
export const DTYPE_RANGE: { [T in Channel["dtype"]]: { min: number; max: number } } = {
  int8: { min: -Math.pow(2, 7), max: Math.pow(2, 7) - 1 },
  int16: { min: -Math.pow(2, 15), max: Math.pow(2, 15) - 1 },
  int32: { min: -Math.pow(2, 31), max: Math.pow(2, 31) - 1 },
  uint8: { min: 0, max: Math.pow(2, 8) - 1 },
  uint16: { min: 0, max: Math.pow(2, 16) - 1 },
  uint32: { min: 0, max: Math.pow(2, 32) - 1 },
  // These are obviously not the actual min and max representable values for floats, but the actual ones (`-Infinity`
  // and `Infinity`) would give us nonsense. These may also produce nonsense, but these types should be rare anyways.
  float32: { min: 0, max: Math.pow(2, 8) - 1 },
  float64: { min: 0, max: Math.pow(2, 8) - 1 },
};

export const PRESET_COLORS_1: ColorArray[] = [
  [190, 68, 171],
  [189, 211, 75],
  [61, 155, 169],
  [128, 128, 128],
  [255, 255, 255],
  [239, 27, 45],
  [238, 77, 245],
  [96, 255, 255],
];
export const PRESET_COLORS_2: ColorArray[] = [
  [128, 0, 0],
  [0, 128, 0],
  [0, 0, 128],
  [32, 32, 32],
  [255, 255, 0],
  [255, 0, 255],
  [0, 255, 0],
  [0, 0, 255],
];

export const PRESET_COLORS_3: ColorArray[] = [
  [128, 0, 128],
  [128, 128, 128],
  [0, 128, 128],
  [128, 128, 0],
  [255, 255, 255],
  [255, 0, 0],
  [255, 0, 255],
  [0, 255, 255],
];

export const PRESET_COLORS_0: ColorArray[] = [
  [226, 205, 179],
  [111, 186, 17],
  [141, 163, 192],
  [245, 241, 203],
  [224, 227, 209],
  [221, 155, 245],
  [227, 244, 245],
  [255, 98, 0],
  [247, 219, 120],
];

export const PRESET_COLOR_MAP = Object.freeze([
  {
    colors: PRESET_COLORS_0,
    name: "Default",
  },
  {
    colors: PRESET_COLORS_1,
    name: "Thumbnail colors",
  },
  {
    colors: PRESET_COLORS_2,
    name: "RGB colors",
  },
  {
    colors: PRESET_COLORS_3,
    name: "White structure",
  },
]);

/** Allows the 3D viewer to apply the default camera settings for the view mode. */
const USE_VIEW_MODE_DEFAULT_CAMERA = undefined;

const viewModeToDefaultCameraPosition: Record<ViewMode, [number, number, number]> = {
  [ViewMode.threeD]: [0, 0, 5],
  [ViewMode.xy]: [0, 0, 2],
  [ViewMode.xz]: [0, 2, 0],
  [ViewMode.yz]: [2, 0, 0],
};

const viewModeToDefaultCameraUp: Record<ViewMode, [number, number, number]> = {
  [ViewMode.threeD]: [0, 1, 0],
  [ViewMode.xy]: [0, 1, 0],
  [ViewMode.xz]: [0, 0, 1],
  [ViewMode.yz]: [0, 0, 1],
};

/**
 * Reflects the default camera settings the 3D viewer uses on volume load.
 * These SHOULD NOT be changed; otherwise, existing shared links that don't specify the
 * camera settings will use the new defaults and may be in unexpected orientations or positions.
 */
export const getDefaultCameraState = (viewMode: ViewMode = ViewMode.threeD): CameraState => ({
  // Default position varies by view mode
  position: viewModeToDefaultCameraPosition[viewMode],
  target: [0, 0, 0],
  up: viewModeToDefaultCameraUp[viewMode],
  fov: 20,
  orthoScale: 0.5,
});

export const getDefaultViewerChannelSettings = (): ViewerChannelSettings => ({
  groups: [
    {
      name: "Channels",
      channels: [
        { match: [0, 1, 2], enabled: true },
        { match: "(.+)", enabled: false },
      ],
    },
  ],
});

/**
 * Returns the default viewer state as a new object.
 */
export const getDefaultViewerState = (): ViewerState => ({
  viewMode: ViewMode.threeD, // "XY", "XZ", "YZ"
  renderMode: RenderMode.volumetric, // "pathtrace", "maxproject"
  imageType: ImageType.segmentedCell,
  showAxes: false,
  showBoundingBox: false,
  backgroundColor: BACKGROUND_COLOR_DEFAULT,
  boundingBoxColor: BOUNDING_BOX_COLOR_DEFAULT,
  autorotate: false,
  maskAlpha: ALPHA_MASK_SLIDER_DEFAULT,
  brightness: BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  density: DENSITY_SLIDER_LEVEL_DEFAULT,
  levels: LEVELS_SLIDER_DEFAULT,
  interpolationEnabled: INTERPOLATION_ENABLED_DEFAULT,
  region: { x: [0, 1], y: [0, 1], z: [0, 1] },
  slice: { x: 0.5, y: 0.5, z: 0.5 },
  time: 0,
  scene: 0,
  // Do not override camera position, target, etc. by default;
  // instead, let the viewer apply default camera settings based on the view mode.
  // This prevents a bug where the camera's position and view mode are set to
  // incompatible states and the viewport becomes blank.
  cameraState: USE_VIEW_MODE_DEFAULT_CAMERA,
});

const INIT_COLORS = PRESET_COLORS_0;

/** Returns the default color for a channel, by its index. */
export function getDefaultChannelColor(channelIndex: number): ColorArray {
  return INIT_COLORS[channelIndex % INIT_COLORS.length];
}

/**
 * Returns the default channel state as a new object. If an index is provided, uses the default
 * color preset for that index.
 * @param index Optional channel index to use for the color preset.
 * @returns a default ChannelState object.
 */
export const getDefaultChannelState = (index: number = 0): ChannelState => {
  return {
    name: "",
    displayName: "",
    volumeEnabled: false,
    isosurfaceEnabled: false,
    colorizeEnabled: false,
    colorizeAlpha: 1.0,
    isovalue: 128,
    opacity: 1.0,
    color: getDefaultChannelColor(index),
    useControlPoints: false,
    ramp: [0, TFEDITOR_MAX_BIN],
    controlPoints: [
      { x: 0, opacity: 0, color: [255, 255, 255] },
      { x: 255, opacity: 1, color: [255, 255, 255] },
    ],
    lockPlotToDataRange: true,
    plotMax: TFEDITOR_MAX_BIN,
  };
};
