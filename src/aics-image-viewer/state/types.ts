import type { CameraState, ControlPoint } from "@aics/vole-core";

import type { XYZ } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";

export enum ViewMode {
  threeD = "3D",
  xy = "XY",
  xz = "XZ",
  yz = "YZ",
}

export enum RenderMode {
  volumetric = "volumetric",
  maxProject = "maxproject",
  pathTrace = "pathtrace",
}

export enum ImageType {
  segmentedCell = "cell",
  fullField = "fov",
}

/** Global (not per-channel) viewer state which may be changed in the UI */
export type ViewerState = {
  viewMode: ViewMode;
  renderMode: RenderMode;
  imageType: ImageType;
  showAxes: boolean;
  showBoundingBox: boolean;
  boundingBoxColor: ColorArray;
  backgroundColor: ColorArray;
  autorotate: boolean;
  maskAlpha: number;
  brightness: number;
  density: number;
  levels: [number, number, number];
  interpolationEnabled: boolean;
  // `region` values are in the range [0, 1]. We derive from this the format that the sliders expect
  // (integers between 0 and num_slices - 1) and the format that view3d expects (in [-0.5, 0.5]).
  // This state is only active in 3d mode.
  region: XYZ<[number, number]>;
  // Store the relative position of the slice in the range [0, 1] for each of 3 axes.
  // This state is active in x,y,z single slice modes.
  slice: XYZ<number>;
  time: number;
  scene: number;
  cameraState: Partial<CameraState> | undefined;
  singleChannelMode: boolean;
  singleChannelIndex: number;
  useExactScaleLevel: boolean;
  scaleLevelIndex: number;
};

/** Settings for a single channel which may be changed in the UI */
export type ChannelState = {
  name: string;
  displayName: string;
  volumeEnabled: boolean;
  isosurfaceEnabled: boolean;
  isovalue: number;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  opacity: number;
  color: ColorArray;
  ramp: [number, number];
  useControlPoints: boolean;
  controlPoints: ControlPoint[];
  plotMin: number;
  plotMax: number;
  /**
   * If true, when a new volume is loaded, keeps the current intensity values
   * (ramp, control points, and isovalue) instead of reinitializing them.
   */
  keepIntensityRange: boolean;
};

/**
 * Property keys for the serialized variants of `ViewerState`. These keys are shorter, for contexts that need brevity
 * (like URLs), and have a stronger guarantee of stability than the keys of `ViewerState`.
 */
export enum ViewerStateKeys {
  /** Axis to view. Valid values are `3D`, `XY`, `XZ`, and `YZ`. Defaults to `3D`. */
  View = "view",
  /** Render mode. Valid values are `volumetric`, `maxproject`, and `pathtrace`. Defaults to `volumetric`. */
  Mode = "mode",
  /** The opacity of the mask channel, an integer in the range `[0, 100]`. Defaults to `50`. */
  Mask = "mask",
  /** The type of image to display. Valid values are `cell` and `fov`. Defaults to `cell`. */
  Image = "image",
  /** Whether to show the axes helper. Boolean, or `0`/`1` when stringified. Default `false`. */
  Axes = "axes",
  /** Whether to show the bounding box. Boolean, or `0`/`1` when stringified. Default `false`. */
  BoundingBox = "bb",
  /** The color of the bounding box, as a 6-digit hex color. */
  BoundingBoxColor = "bbcol",
  /** The background color, as a 6-digit hex color. */
  BackgroundColor = "bgcol",
  /** Whether to autorotate the view. Boolean, or `0`/`1` when stringified. Default `false`. */
  Autorotate = "rot",
  /** The brightness of the image, a float in the range `[0, 100]`. Default `70`. */
  Brightness = "bright",
  /** Density, a float in the range `[0, 100]`. Default `50`. */
  Density = "dens",
  /**
   * Levels for image intensity adjustment. Should be a three-element array of numbers (comma-separated when
   * stringified), representing the low, middle, and high values in the range `[0, 255]`. Values will be sorted in
   * ascending order. Empty values in stringified form will be parsed as `0`.
   */
  Levels = "lvl",
  /** Whether to enable interpolation. Boolean, or `0`/`1` when stringified. Default `true`. */
  Interpolation = "interp",
  /**
   * Size of the clipped subregion, in the form `{ x: [xmin, xmax], y: [ymin, ymax], z: [zmin, zmax] }`.
   * Stringifies to the form `xmin:xmax,ymin:ymax,zmin:zmax`. Default full range (`[0, 1]`) for each axis.
   */
  Region = "reg",
  /**
   * Slice position per X, Y, and Z axes, as a three-element array of floats (comma-separated when stringified).
   * Default `0.5` for all axes (e.g. `[0.5, 0.5, 0.5]`).
   */
  Slice = "slice",
  /** Frame number, for time-series volumes. `0` by default. */
  Time = "t",
  /** Scene number, for multiscene images. `0` by default. */
  Scene = "scene",
  /**
   * Camera transform settings. An object with the following keys, as defined in `CameraTransformKeys`:
   * Valid keys are defined in `CameraTransformKeys`:
   * - `pos`: position
   * - `tar`: target
   * - `up`: up
   * - `ort`: orthographic scale
   * - `fov`: field of view
   *
   * Stringifies to a list of `key:value` pairs separated by commas. Vector values are encoded as three floats
   * separated by colons (e.g. `1:2:3`) and encoded using `encodeURIComponent`.
   */
  CameraState = "cam",
  /** Whether single-channel mode is active. Boolean, or `0`/`1` when stringified. Default `false`. */
  SingleChannelMode = "scm",
  /** If single-channel mode is active, which channel index is shown. Default `0`. */
  SingleChannelIndex = "sci",
  /** Whether to use an exact scale level index. Boolean, or `0`/`1` when stringified. Default `false`. */
  UseExactScaleLevel = "esl",
  /** The exact scale level index to use, if `UseExactScaleLevel` is `true`. Default `0`. */
  ScaleLevelIndex = "scl",
}

export enum CameraTransformKeys {
  /** Camera position in 3D coordinates. */
  Position = "pos",
  /** Target position of the trackball controls in 3D coordinates. */
  Target = "tar",
  /** The up vector of the camera. Will be normalized to magnitude of 1. */
  Up = "up",
  /** Scale factor for orthographic cameras. */
  OrthoScale = "ort",
  /** Vertical FOV of the camera view frustum, from top to bottom, in degrees. */
  Fov = "fov",
}

/** Serialized version of `ViewerState`. */
export type ViewerStateParams = { [K in ViewerStateKeys]: string | undefined };

/**
 * Mapped to types in `ViewerChannelStateParams`.
 */
export enum ViewerChannelSettingKeys {
  Color = "col",
  Colorize = "clz",
  ColorizeAlpha = "cza",
  IsosurfaceAlpha = "isa",
  Lut = "lut",
  ControlPoints = "cpt",
  ControlPointsLegacy = "cps",
  Ramp = "ram",
  RampLegacy = "rmp",
  ControlPointsEnabled = "cpe",
  VolumeEnabled = "ven",
  SurfaceEnabled = "sen",
  IsosurfaceValue = "isv",
  KeepRange = "pin",
}

/**
 * The serialized form of a ViewerChannelSetting, as a dictionary object.
 */
export type ViewerChannelStateParams = {
  /** Color, as a 6-digit hex color.  */
  [ViewerChannelSettingKeys.Color]?: string;
  /** Colorize. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.Colorize]?: string;
  /** Colorize alpha, in the [0, 1] range. Set to `1.0` by default. */
  [ViewerChannelSettingKeys.ColorizeAlpha]?: string;
  /** Isosurface alpha, in the [0, 1 range]. Set to `1.0` by default.*/
  [ViewerChannelSettingKeys.IsosurfaceAlpha]?: string;
  /**
   * Lookup table (LUT) to map from volume intensity to opacity. Should be two
   * alphanumeric values separated by a colon, where the first value is the
   * minimum and the second is the maximum. Defaults to [0, 255].
   *
   * Min and max values are determined as following:
   * - Plain numbers are indices of histogram bins, typically in the range [0,
   *   255].
   * - `v{n}` represents a raw intensity value, where `n` is a number.
   * - `p{n}` represents a percentile, where `n` is a percentile in the [0, 100]
   *   range.
   * - `m{n}` represents the median multiplied by `n / 100`.
   * - `autoij` in either the min or max fields will use the "auto" algorithm
   *   from ImageJ to select the min AND max.
   *
   * Values will be used to determine the initial control points and ramp if
   * those fields are not provided.
   *
   * @example
   * ```
   * "0:255"    // min: intensity 0, max: intensity 255.
   * "p50:p90"  // min: 50th percentile, max: 90th percentile.
   * "m1:p75"   // min: median, max: 75th percentile.
   * "autoij:0" // use Auto-IJ to calculate min and max.
   * ```
   */
  [ViewerChannelSettingKeys.Lut]?: string;
  /**
   * Legacy specifier for control points for the transfer function as a list of
   * `x:opacity:color` triplets, separated by colon. Uses histogram bin indices
   * instead of intensity values.
   * - `x` is a histogram bin index in the [0, 255] range.
   * - `opacity` is a float in the [0, 1] range.
   * - `color` is a 6-digit hex color, e.g. `ff0000`.
   *
   * Will be overridden by the ControlPoints field (`cpt`) if provided.
   */
  [ViewerChannelSettingKeys.ControlPointsLegacy]?: string;
  /**
   * Control points for the transfer function, formatted as a list of
   * `x:opacity:color` triplets, separated by colons.
   * - `x` is a numeric intensity value.
   * - `opacity` is a float in the [0, 1] range.
   * - `color` is a 6-digit hex color, e.g. `ff0000`.
   *
   * If provided, overrides the `lut` field when calculating the control points.
   */
  [ViewerChannelSettingKeys.ControlPoints]?: string;
  /**
   * Whether to show advanced mode, which will show control points instead of
   * ramp values defined by the LUT. "1" is enabled, disabled by default.
   */
  [ViewerChannelSettingKeys.ControlPointsEnabled]?: string;
  /**
   * Legacy specifier for the transfer function ramp which uses histogram bin
   * indices instead of intensity values, formatted as `min:max`. Will be
   * overridden by the Ramp field (`ram`) if provided.
   */
  [ViewerChannelSettingKeys.RampLegacy]?: string;
  /**
   * Ramp min and max intensity values (`min:max`). If provided, overrides the
   * `lut` field when calculating the ramp.
   */
  [ViewerChannelSettingKeys.Ramp]?: string;
  /** Volume enabled. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.VolumeEnabled]?: string;
  /** Isosurface enabled. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.SurfaceEnabled]?: string;
  /** Isosurface value, in the [0, 255] range. Set to `128` by default. */
  [ViewerChannelSettingKeys.IsosurfaceValue]?: string;
  /**
   * Whether to keep the current contrast settings when loading a new volume.
   * "1" is enabled. Disabled by default.
   */
  [ViewerChannelSettingKeys.KeepRange]?: string;
};
