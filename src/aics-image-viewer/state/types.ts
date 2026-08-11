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
 * The variants of `ViewMode` that appear in serialized representations of state
 * (`ViewerStateSnapshot`, `ViewerStateStringified`).
 *
 * **IMPORTANT:** Changing the values of this enum will BREAK existing image sharing links and exported app state.
 * Ideally, you should never do it. If you must, you must also add code to version-check and handle previous values.
 */
export enum ViewModeSnapshot {
  threeD = "3D",
  xy = "Z",
  xz = "Y",
  yz = "X",
}

/**
 * The variants of `RenderMode` that appear in serialized representations of state
 * (`ViewerStateSnapshot`, `ViewerStateStringified`).
 *
 * **IMPORTANT:** Changing the values of this enum will BREAK existing image sharing links and exported app state.
 * Ideally, you should never do it. If you must, you must also add code to version-check and handle previous values.
 */
export enum RenderModeSnapshot {
  volumetric = "volumetric",
  maxProject = "maxproject",
  pathTrace = "pathtrace",
}

/**
 * The variants of `ImageType` that appear in serialized representations of state
 * (`ViewerStateSnapshot`, `ViewerStateStringified`).
 *
 * **IMPORTANT:** Changing the values of this enum will BREAK existing image sharing links and exported app state.
 * Ideally, you should never do it. If you must, you must also add code to version-check and handle previous values.
 */
export enum ImageTypeSnapshot {
  segmentedCell = "cell",
  fullField = "fov",
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

export type CameraStateSnapshot = {
  [CameraTransformKeys.Position]?: [number, number, number];
  [CameraTransformKeys.Target]?: [number, number, number];
  [CameraTransformKeys.Up]?: [number, number, number];
  [CameraTransformKeys.OrthoScale]?: number;
  [CameraTransformKeys.Fov]?: number;
};

export type CameraStateStringified = { [K in CameraTransformKeys]?: string };

/**
 * Property keys for the "snapshot" variants of `ViewerState`. These keys are shorter, for contexts that need brevity
 * (like URLs), and have a stronger guarantee of stability than the keys of `ViewerState`.
 *
 * **IMPORTANT:** Changing the values of this enum will BREAK existing image sharing links and exported app state.
 * Ideally, you should never do it. If you must, you must also add code to version-check and handle previous values.
 */
export enum ViewerStateSnapshotKeys {
  /** Axis to view. Snapshot values are `3D`, `Z`, `Y`, `X` (from `ViewModeSnapshot`). */
  View = "view",
  /** Render mode. Possible values are `volumetric`, `maxproject`, or `pathtrace` (from `RenderModeSnapshot`). */
  Mode = "mode",
  /** The opacity of the mask channel, an integer in the range `[0, 100]`. Defaults to `50`. */
  MaskOpacity = "mask",
  /** The type of image to display. Valid values are `cell` and `fov` (from `ImageTypeSnapshot`). Default `cell`. */
  ImageType = "image",
  /** Whether to show the axes helper. Boolean, or `0`/`1` when stringified. Default `false`. */
  ShowAxes = "axes",
  /** Whether to show the bounding box. Boolean, or `0`/`1` when stringified. Default `false`. */
  ShowBoundingBox = "bb",
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
   * Size of the clipped subregion, in the form `[[xmin, xmax], [ymin, ymax], [zmin, zmax]]`.
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
   * Camera transform settings. An object with type `CameraTransformSnapshot`; see `CameraTransformKeys` for more.
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

/**
 * Property keys for the "snapshot" variants of `ChannelState`/`ViewerChannelSettings`. These keys are shorter, for
 * contexts that need brevity (like URLs), and have a stronger guarantee of stability than the keys of `ChannelState`.
 *
 * **IMPORTANT:** Changing the values of this enum will BREAK existing image sharing links and exported app state.
 * Ideally, you should never do it. If you must, you must also add code to version-check and handle previous values.
 */
export enum ChannelStateSnapshotKeys {
  /** Color, as a 6-digit hex color.  */
  Color = "col",
  /** Whether colorize is enabled. Boolean, or `0`/`1` when stringified. Default `false`. */
  Colorize = "clz",
  /** Colorize alpha, in the range `[0, 1]`. Default `1.0`. */
  ColorizeAlpha = "cza",
  /** Isosurface alpha, in the range `[0, 1]`. Set to `1.0` by default.*/
  IsosurfaceAlpha = "isa",
  /**
   * Lookup table (LUT) to map from volume intensity to opacity. A two-element array of alphanumeric values
   * (colon-separated when stringified), where the first value is the minimum and the second is the maximum.
   * Default `[0, 255]`.
   *
   * Min and max values are determined as following:
   * - Plain numbers are indices of histogram bins, typically in the range `[0, 255]`.
   * - `v{n}` represents a raw intensity value, where `n` is a number.
   * - `p{n}` represents a percentile, where `n` is a percentile in the range `[0, 100]`.
   * - `m{n}` represents the median multiplied by `n / 100`.
   * - `autoij` in either the min or max fields will use the "auto" algorithm from ImageJ to select the min AND max.
   *
   * This field has no counterpart in `ChannelState`. It will be used to determine the initial values of
   * `ControlPoints` and `Ramp` if those fields are not provided.
   *
   * @example
   * ```
   * "0:255"    // min: intensity 0, max: intensity 255.
   * "p50:p90"  // min: 50th percentile, max: 90th percentile.
   * "m1:p75"   // min: median, max: 75th percentile.
   * "autoij:0" // use Auto-IJ to calculate min and max.
   * ```
   */
  Lut = "lut",
  /**
   * Control points for the transfer function, formatted as a list of objects of type `ControlPointSnapshot` with the
   * following keys:
   * - `x` is a numeric intensity value.
   * - `opacity` is a float in the range `[0, 1]`.
   * - `color` is a 6-digit hex color, e.g. `"ff0000"`. For the extremely common default case where the control point is
   *   white (`"ffffff"`), `color` is shortened to just `"1"`.
   *
   * Stringifies to a colon-separated list: `x1:opacity1:color1:x2:opacity2:color2:...`
   *
   * If provided, overrides the `lut` field when calculating control points.
   */
  ControlPoints = "cpt",
  /**
   * Legacy specifier for control points for the transfer function. Formatted exactly like `ControlPoints`,
   * except `x` represents histogram bin indices (in the range `[0, 255]`), not raw intensities.
   *
   * Will be overridden by the `ControlPoints` field (`cpt`) if provided.
   */
  ControlPointsLegacy = "cps",
  /**
   * Ramp min and max intensity values. Two-element array, colon-separated when stringified (`min:max`).
   *
   * If provided, overrides the `lut` field when calculating the ramp.
   */
  Ramp = "ram",
  /**
   * Legacy specifier for the transfer function ramp. Formatted exactly like `Ramp`, except values represent histogram
   * bin indices (in the range `[0, 255]`), not raw intensities.
   *
   * Will be overridden by the Ramp field (`ram`) if provided.
   */
  RampLegacy = "rmp",
  /**
   * Whether this channel's settings are in "advanced mode" and using control points rather than min/max ramp to derive
   * the transfer function. Boolean, or `0`/`1` when stringified. Default `false`.
   */
  ControlPointsEnabled = "cpe",
  /** Whether volume is enabled. Boolean, or `0`/`1` when stringified. Default `false`. */
  VolumeEnabled = "ven",
  /** Whether isosurface is enabled. Boolean, or `0`/`1` when stringified. Default `false`. */
  SurfaceEnabled = "sen",
  /** Isosurface value, in the range `[0, 255]`. Default `128`. */
  IsosurfaceValue = "isv",
  /**
   * Whether to keep the current contrast settings when loading a new volume. Boolean, or `0`/`1` when stringified.
   * Default `false`.
   */
  KeepRange = "pin",
}

// Maps `ViewerStateKeys` to the type of each key in `ViewerStateSnapshot`.
// This is not the exported "snapshot" type: that's `ViewerStateSnapshot`, below. Defining `ViewerStateSnapshot` as
// a mapped type ensures that if a variant is added to `ViewerStateKeys`, `ViewerStateSnapshot` will type error until
// that key's value is added to this type.
type ViewerStateSnapshotTypes = {
  [ViewerStateSnapshotKeys.View]: ViewModeSnapshot;
  [ViewerStateSnapshotKeys.Mode]: RenderModeSnapshot;
  [ViewerStateSnapshotKeys.MaskOpacity]: number;
  [ViewerStateSnapshotKeys.ImageType]: ImageTypeSnapshot;
  [ViewerStateSnapshotKeys.ShowAxes]: boolean;
  [ViewerStateSnapshotKeys.ShowBoundingBox]: boolean;
  [ViewerStateSnapshotKeys.BoundingBoxColor]: string;
  [ViewerStateSnapshotKeys.BackgroundColor]: string;
  [ViewerStateSnapshotKeys.Autorotate]: boolean;
  [ViewerStateSnapshotKeys.Brightness]: number;
  [ViewerStateSnapshotKeys.Density]: number;
  [ViewerStateSnapshotKeys.Levels]: [number, number, number];
  [ViewerStateSnapshotKeys.Interpolation]: boolean;
  [ViewerStateSnapshotKeys.Region]: [[number, number], [number, number], [number, number]];
  [ViewerStateSnapshotKeys.Slice]: [number, number, number];
  [ViewerStateSnapshotKeys.Time]: number;
  [ViewerStateSnapshotKeys.Scene]: number;
  [ViewerStateSnapshotKeys.CameraState]: CameraStateSnapshot;
  [ViewerStateSnapshotKeys.SingleChannelMode]: boolean;
  [ViewerStateSnapshotKeys.SingleChannelIndex]: number;
  [ViewerStateSnapshotKeys.UseExactScaleLevel]: boolean;
  [ViewerStateSnapshotKeys.ScaleLevelIndex]: number;
};

/**
 * A "snapshot" of a `ViewerState`.
 *
 * This type is a variant representation of `ViewerState`, specialized for saving/restoring state to/from some
 * serialized representation. It has the following desirable properties for this purpose:
 * - Its keys are *shorter*, for formats where that's desirable (mostly URL parameters)
 * - Its keys are reasonably *stable*, so that settings exported from older app versions can be imported by newer ones
 * - Some values, notably colors, are converted to alternate representations for compactness and/or clarity
 */
export type ViewerStateSnapshot = { [K in ViewerStateSnapshotKeys]?: ViewerStateSnapshotTypes[K] };

/**
 * A `ViewerStateSnapshot` with all its keys converted to compact string representations. Useful for (de)serializing
 * viewer state to/from URL parameters.
 */
export type ViewerStateStringified = { [K in ViewerStateSnapshotKeys]?: string };

/**
 * A `ControlPoint` where `color` is a six-digit hex string, or gets shortened to `"1"` in the overwhelming majority of
 * cases where the control point is white to save space in sharing URLs. Used by `ChannelStateSnapshot`.
 */
export type ControlPointSnapshot = {
  x: number;
  opacity: number;
  color: string;
};

// Maps `ChannelStateKeys` to the type of each key in `ChannelStateSnapshot`.
// This is not the exported "snapshot" type: that's `ChannelStateSnapshot`, below. Defining `ChannelStateSnapshot` as
// a mapped type ensures that if a variant is added to `ChannelStateKeys`, `ChannelStateSnapshot` will type error until
// that key's value is added to this type.
type ChannelStateSnapshotTypes = {
  [ChannelStateSnapshotKeys.Color]: string;
  [ChannelStateSnapshotKeys.Colorize]: boolean;
  [ChannelStateSnapshotKeys.ColorizeAlpha]: number;
  [ChannelStateSnapshotKeys.IsosurfaceAlpha]: number;
  [ChannelStateSnapshotKeys.Lut]: [string | number, string | number];
  [ChannelStateSnapshotKeys.ControlPointsLegacy]: ControlPointSnapshot[];
  [ChannelStateSnapshotKeys.ControlPoints]: ControlPointSnapshot[];
  [ChannelStateSnapshotKeys.ControlPointsEnabled]: boolean;
  [ChannelStateSnapshotKeys.RampLegacy]: [number, number];
  [ChannelStateSnapshotKeys.Ramp]: [number, number];
  [ChannelStateSnapshotKeys.VolumeEnabled]: boolean;
  [ChannelStateSnapshotKeys.SurfaceEnabled]: boolean;
  [ChannelStateSnapshotKeys.IsosurfaceValue]: number;
  [ChannelStateSnapshotKeys.KeepRange]: boolean;
};

/**
 * A "snapshot" of a `ChannelState` or `ViewerChannelSetting`.
 *
 * This type is a variant representation of `ChannelState`/`ViewerChannelSetting`, specialized for saving/restoring
 * channel state to/from some serialized representation. It has the following desirable properties for this purpose:
 * - Its keys are *shorter*, for formats where that's desirable (mostly URL parameters)
 * - Its keys are reasonably *stable*, so that settings exported from older app versions can be imported by newer ones
 * - Some values, notably colors, are converted to alternate representations for compactness and/or clarity
 */
export type ChannelStateSnapshot = { [K in ChannelStateSnapshotKeys]?: ChannelStateSnapshotTypes[K] };

/**
 * A `ChannelStateSnapshot` with all its keys converted to compact string representations. Useful for (de)serializing
 * channel state to/from URL parameters.
 */
export type ChannelStateStringified = { [K in ChannelStateSnapshotKeys]?: string };
