import type { CameraState, ControlPoint } from "@aics/vole-core";

import type { ImageType, RenderMode, ViewMode } from "../shared/enums";
import type { PerAxis } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";

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
  region: PerAxis<[number, number]>;
  // Store the relative position of the slice in the range [0, 1] for each of 3 axes.
  // This state is active in x,y,z single slice modes.
  slice: PerAxis<number>;
  time: number;
  scene: number;
  cameraState: Partial<CameraState> | undefined;
  singleChannelMode: boolean;
  singleChannelIndex: number;
  useExactScaleLevel: boolean;
  scaleLevelIndex: number;
  offsetScaleLevelForPlayback: boolean;
  playbackScaleLevelOffset: number;
};

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
 * Enum keys for serialized viewer settings. These are stored as enums for
 * better readability, and are mapped to types in `ViewerStateParams`.
 */
export enum ViewerStateKeys {
  View = "view",
  Mode = "mode",
  Mask = "mask",
  Image = "image",
  Axes = "axes",
  BoundingBox = "bb",
  BoundingBoxColor = "bbcol",
  BackgroundColor = "bgcol",
  Autorotate = "rot",
  Brightness = "bright",
  Density = "dens",
  Levels = "lvl",
  Interpolation = "interp",
  Region = "reg",
  Slice = "slice",
  Time = "t",
  Scene = "scene",
  CameraState = "cam",
  SingleChannelMode = "scm",
  SingleChannelIndex = "sci",
  UseExactScaleLevel = "esl",
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
export class ViewerStateParams {
  /** Axis to view. Valid values are "3D", "X", "Y", and "Z". Defaults to "3D". */
  [ViewerStateKeys.View]?: string = undefined;
  /**
   * Render mode. Valid values are "volumetric", "maxproject", and "pathtrace".
   * Defaults to "volumetric".
   */
  [ViewerStateKeys.Mode]?: string = undefined;
  /** The opacity of the mask channel, an integer in the range [0, 100]. Defaults to 50. */
  [ViewerStateKeys.Mask]?: string = undefined;
  /** The type of image to display. Valid values are "cell" and "fov". Defaults to "cell". */
  [ViewerStateKeys.Image]?: string = undefined;
  /** Whether to show the axes helper. "1" is enabled. Disabled by default. */
  [ViewerStateKeys.Axes]?: string = undefined;
  /** Whether to show the bounding box. "1" is enabled. Disabled by default. */
  [ViewerStateKeys.BoundingBox]?: string = undefined;
  /** Whether single-channel mode is active. "1" is active. Inactive by default. */
  [ViewerStateKeys.SingleChannelMode]?: string = undefined;
  /** If single-channel mode is active, which channel index is shown. Defaults to 0. */
  [ViewerStateKeys.SingleChannelIndex]?: string = undefined;
  /** The color of the bounding box, as a 6-digit hex color. */
  [ViewerStateKeys.BoundingBoxColor]?: string = undefined;
  /** The background color, as a 6-digit hex color. */
  [ViewerStateKeys.BackgroundColor]?: string = undefined;
  /** Whether to autorotate the view. "1" is enabled. Disabled by default. */
  [ViewerStateKeys.Autorotate]?: string = undefined;
  /** The brightness of the image, an float in the range [0, 100]. Defaults to 70. */
  [ViewerStateKeys.Brightness]?: string = undefined;
  /** Density, a float in the range [0, 100]. Defaults to 50. */
  [ViewerStateKeys.Density]?: string = undefined;
  /**
   * Levels for image intensity adjustment. Should be three numeric values separated
   * by commas, representing the low, middle, and high values in a [0, 255] range.
   * Values will be sorted in ascending order; empty values will be parsed as 0.
   */
  [ViewerStateKeys.Levels]?: string = undefined;
  /** Whether to enable interpolation. "1" is enabled. Enabled by default. */
  [ViewerStateKeys.Interpolation]?: string = undefined;
  /** Subregions per axis, as min:max pairs separated by commas.
   * Defaults to full range (`0:1`) for each axis.
   */
  [ViewerStateKeys.Region]?: string = undefined;
  /** Slice position per X, Y, and Z axes, as a list of comma-separated floats.
   * 0.5 for all axes by default (e.g. `0.5,0.5,0.5`)
   */
  [ViewerStateKeys.Slice]?: string = undefined;
  /** Frame number, for time-series volumes. 0 by default. */
  [ViewerStateKeys.Time]?: string = undefined;
  /** Scene number, for multiscene images. 0 by default. */
  [ViewerStateKeys.Scene]?: string = undefined;
  /** Whether to use an exact scale level index. 0 by default. */
  [ViewerStateKeys.UseExactScaleLevel]?: string = undefined;
  /** The exact scale level index to use, if `UseExactScaleLevel` is 1. 0 by default. */
  [ViewerStateKeys.ScaleLevelIndex]?: string = undefined;
  /**
   * Camera transform settings, as a list of `key:value` pairs separated by commas.
   * Valid keys are defined in `CameraTransformKeys`:
   * - `pos`: position
   * - `tar`: target
   * - `up`: up
   * - `ort`: orthographic scale
   * - `fov`: field of view
   *
   * Vector values are encoded as three floats separated by colons (e.g. `1:2:3`) and
   * encoded using `encodeURIComponent`.
   */
  [ViewerStateKeys.CameraState]?: string = undefined;
}

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
export class ViewerChannelStateParams {
  /** Color, as a 6-digit hex color.  */
  [ViewerChannelSettingKeys.Color]?: string = undefined;
  /** Colorize. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.Colorize]?: "1" | "0" = undefined;
  /** Colorize alpha, in the [0, 1] range. Set to `1.0` by default. */
  [ViewerChannelSettingKeys.ColorizeAlpha]?: string = undefined;
  /** Isosurface alpha, in the [0, 1 range]. Set to `1.0` by default.*/
  [ViewerChannelSettingKeys.IsosurfaceAlpha]?: string = undefined;
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
  [ViewerChannelSettingKeys.Lut]?: string = undefined;
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
  [ViewerChannelSettingKeys.ControlPointsLegacy]?: string = undefined;
  /**
   * Control points for the transfer function, formatted as a list of
   * `x:opacity:color` triplets, separated by colons.
   * - `x` is a numeric intensity value.
   * - `opacity` is a float in the [0, 1] range.
   * - `color` is a 6-digit hex color, e.g. `ff0000`.
   *
   * If provided, overrides the `lut` field when calculating the control points.
   */
  [ViewerChannelSettingKeys.ControlPoints]?: string = undefined;
  /**
   * Whether to show advanced mode, which will show control points instead of
   * ramp values defined by the LUT. "1" is enabled, disabled by default.
   */
  [ViewerChannelSettingKeys.ControlPointsEnabled]?: "1" | "0" = undefined;
  /**
   * Legacy specifier for the transfer function ramp which uses histogram bin
   * indices instead of intensity values, formatted as `min:max`. Will be
   * overridden by the Ramp field (`ram`) if provided.
   */
  [ViewerChannelSettingKeys.RampLegacy]?: string = undefined;
  /**
   * Ramp min and max intensity values (`min:max`). If provided, overrides the
   * `lut` field when calculating the ramp.
   */
  [ViewerChannelSettingKeys.Ramp]?: string = undefined;
  /** Volume enabled. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.VolumeEnabled]?: "1" | "0" = undefined;
  /** Isosurface enabled. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.SurfaceEnabled]?: "1" | "0" = undefined;
  /** Isosurface value, in the [0, 255] range. Set to `128` by default. */
  [ViewerChannelSettingKeys.IsosurfaceValue]?: string = undefined;
  /**
   * Whether to keep the current contrast settings when loading a new volume.
   * "1" is enabled. Disabled by default.
   */
  [ViewerChannelSettingKeys.KeepRange]?: "1" | "0" = undefined;
}
