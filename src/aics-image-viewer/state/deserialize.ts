import type { CameraState, ControlPoint } from "@aics/vole-core";

import { ImageType, RenderMode, ViewMode } from "../shared/enums";
import type { PerAxis } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";
import { removeUndefinedProperties } from "../shared/utils/datatypes";
import { clamp } from "../shared/utils/math";
import type { ViewerChannelSetting } from "../shared/utils/viewerChannelSettings";
import {
  CameraTransformKeys,
  ViewerChannelSettingKeys,
  type ViewerChannelStateParams,
  type ViewerState,
  ViewerStateKeys,
  type ViewerStateParams,
} from "./types";

export const ENCODED_COMMA_REGEX = /%2C/g;
export const ENCODED_COLON_REGEX = /%3A/g;
const DEFAULT_CONTROL_POINT_COLOR: [number, number, number] = [255, 255, 255];
const DEFAULT_CONTROL_POINT_COLOR_CODE = "1";

const FLOAT_REGEX = /-?[0-9]*.?[0-9]+/;

/** Match colon-separated pairs of alphanumeric strings */
const LUT_REGEX = /^-?[a-z0-9.]*:[ ]*-?[a-z0-9.]*$/;

/**
 * Match colon-separated pairs of numeric strings, representing histogram bin
 * indices or intensity values.
 */
const RAMP_REGEX = new RegExp(`^${FLOAT_REGEX.source}:${FLOAT_REGEX.source}$`);

/**
 * Match comma-separated triplet of numeric strings.
 */
const SLICE_REGEX = new RegExp(`^${FLOAT_REGEX.source},${FLOAT_REGEX.source},${FLOAT_REGEX.source}$`);

/**
 * Matches a sequence of three comma-separated min:max number pairs, representing
 * the x, y, and z axes.
 */
const REGION_REGEX = new RegExp(
  `^(${FLOAT_REGEX.source}:${FLOAT_REGEX.source})(,${FLOAT_REGEX.source}:${FLOAT_REGEX.source}){2}$`
);

const HEX_COLOR_REGEX = new RegExp(`(([0-9a-fA-F]{6})|${DEFAULT_CONTROL_POINT_COLOR_CODE})`);

/** Represents control points specified by bin indices. */
const CONTROL_POINT_REGEX = new RegExp(`(${FLOAT_REGEX.source}:${FLOAT_REGEX.source}:${HEX_COLOR_REGEX.source})`);

const HEX_COLOR_STR_REGEX = new RegExp(`^${HEX_COLOR_REGEX.source}$`);

/**
 * LEGACY: Matches a COMMA-separated list of control points, where each control point is represented
 * by a triplet of `{x}:{opacity}:{hex color}`.
 * The hex color can be replaced with `1` to represent white (`ffffff`).
 */
export const LEGACY_CONTROL_POINTS_REGEX = new RegExp(
  `^${CONTROL_POINT_REGEX.source}(,${CONTROL_POINT_REGEX.source})*$`
);

/**
 * Matches a COLON-separated list of control points, where each control point is
 * represented by a triplet of `{x}:{opacity}:{hex color}`.
 * - `x` is a value that will either be parsed as a histogram bin index (legacy,
 *   for `ControlPointsLegacy`) or intensity value (for `ControlPoints`),
 *   depending on on which field is being parsed.
 * - Opacity is a float in the [0, 1] range.
 * - The hex color is a 6-digit hex color (e.g. `ffeecc`), and can be replaced
 *   with `1` to represent white (`ffffff`).
 */
export const CONTROL_POINTS_REGEX = new RegExp(`^${CONTROL_POINT_REGEX.source}(:${CONTROL_POINT_REGEX.source})*$`);

/**
 * Parse a string list of comma-separated key:value pairs into
 * a key-value object.
 *
 * @param data The string to parse. Expected to be in the format
 * "key1:value1,key2:value2,...". Commas in keys or values
 * must be encoded using `encodeURIComponent`.
 * @returns An object with the parsed key-value pairs. Key and value strings
 *  will be decoded using `decodeURIComponent`.
 */
export function parseKeyValueList(data: string): Record<string, string> {
  if (data === "") {
    return {};
  }
  const result: Record<string, string> = {};
  const keyValuePairs = data.split(",");
  for (const pair of keyValuePairs) {
    const splitIndex = pair.indexOf(":");
    const key = pair.slice(0, splitIndex);
    const value = pair.slice(splitIndex + 1);
    result[decodeURIComponent(key).trim()] = decodeURIComponent(value).trim();
  }
  return result;
}

/**
 * Parses a string to a float and clamps the result to the [min, max] range.
 * Returns `undefined` if the string is undefined or NaN.
 * @param value String to parse as a float. Will be parsed with `Number.parseFloat`.
 * @param min Minimum value, inclusive.
 * @param max Maximum value, inclusive.
 * @returns
 * - The parsed number, clamped to the [min, max] range.
 * - `undefined` if the string is undefined or NaN.
 */
export function parseStringFloat(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const number = Number.parseFloat(value);
  return Number.isNaN(number) ? undefined : clamp(number, min, max);
}

/**
 * Parses a string to an integer and clamps the result to the [min, max] range.
 * @param value String to parse as a float. Assumes base 10, parses with `Number.parseInt(value, 10)`.
 * @param min Minimum value, inclusive.
 * @param max Maximum value, inclusive.
 * @returns
 * - The parsed number, clamped to the [min, max] range.
 * - `undefined` if the string is undefined or NaN.
 */
export function parseStringInt(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return undefined;
  }
  return clamp(number, min, max);
}

/**
 * Parses a string to an enum value; if the string is not in the enum, returns the default value.
 * @param value String to parse.
 * @param enumValues Enum. Cannot be a `const enum`, as these are removed at compile time.
 * @param defaultValue Default value to return if the string is not in the enum.
 * @returns A value from the enum or the default value. Note that the return type includes `undefined`
 * if the `defaultValue` is `undefined`.
 */
export function parseStringEnum<E extends string, T extends E | undefined>(
  value: string | undefined,
  enumValues: Record<string | number | symbol, E>,
  defaultValue: T = undefined as T
): T {
  if (value === undefined || !Object.values(enumValues).includes(value as E)) {
    return defaultValue;
  }
  return value as T;
}

/**
 * Parses a string boolean value ("1" as true, "0" as false), and returns `undefined` if the value is `undefined`.
 */
function parseStringBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "1";
}

export function parseHexColorAsColorArray(hexColor: string | undefined): ColorArray | undefined {
  if (!hexColor || !HEX_COLOR_STR_REGEX.test(hexColor)) {
    return undefined;
  }
  // if (hexColor in COLOR_CODES) {
  //   return COLOR_CODES[hexColor];
  // }
  if (hexColor === DEFAULT_CONTROL_POINT_COLOR_CODE) {
    return DEFAULT_CONTROL_POINT_COLOR;
  }
  const r = Number.parseInt(hexColor.slice(0, 2), 16);
  const g = Number.parseInt(hexColor.slice(2, 4), 16);
  const b = Number.parseInt(hexColor.slice(4, 6), 16);
  return [r, g, b];
}

function parseStringSlice(region: string | undefined): PerAxis<number> | undefined {
  if (!region || !SLICE_REGEX.test(region)) {
    return undefined;
  }
  const [x, y, z] = region.split(",").map((val) => parseStringFloat(val, 0, 1));
  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }
  return { x, y, z };
}

/**
 * Parses an array of three numbers from a string.
 * @param stringArr The string to parse. Should be three numbers separated by a separator.
 * @param options Optional parameters for parsing:
 * - `min`: Minimum value for each number. Default is negative infinity.
 * - `max`: Maximum value for each number. Default is positive infinity.
 * - `separator`: Separator between numbers. Default is `,`.
 * @returns
 * - undefined if the string is undefined or could not be parsed.
 * - An array of three numbers, clamped to the [min, max] range.
 */
function parseThreeNumberArray(
  stringArr: string | undefined,
  options?: { min?: number; max?: number; separator?: string }
): [number, number, number] | undefined {
  if (!stringArr) {
    return undefined;
  }

  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  const separator = options?.separator ?? ",";

  const [x, y, z] = stringArr.split(separator).map((val) => parseStringFloat(val, min, max));
  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }
  return [x, y, z];
}

function parseStringRegion(region: string | undefined): PerAxis<[number, number]> | undefined {
  if (!region || !REGION_REGEX.test(region)) {
    return undefined;
  }
  const [x, y, z] = region.split(",").map((axis): [number, number] | undefined => {
    // each is a min/max pair
    const [min, max] = axis.split(":").map((val) => parseStringFloat(val, 0, 1));
    if (min === undefined || max === undefined) {
      return undefined;
    }
    // Ensure sorted order
    return min < max ? [min, max] : [max, min];
  });
  // Check for undefined values
  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }
  return { x, y, z };
}

function parseCameraState(cameraSettings: string | undefined): Partial<CameraState> | undefined {
  if (!cameraSettings) {
    return undefined;
  }
  const parsedCameraSettings = parseKeyValueList(cameraSettings);
  const result: Partial<CameraState> = {
    position: parseThreeNumberArray(parsedCameraSettings[CameraTransformKeys.Position], { separator: ":" }),
    target: parseThreeNumberArray(parsedCameraSettings[CameraTransformKeys.Target], { separator: ":" }),
    up: parseThreeNumberArray(parsedCameraSettings[CameraTransformKeys.Up], { separator: ":" }),
    // Orthographic scales cannot be negative
    orthoScale: parseStringFloat(parsedCameraSettings[CameraTransformKeys.OrthoScale], 0, Infinity),
    fov: parseStringFloat(parsedCameraSettings[CameraTransformKeys.Fov], 0, 180),
  };
  return removeUndefinedProperties(result);
}

export function deserializeViewerState(params: ViewerStateParams): Partial<ViewerState> {
  const result: Partial<ViewerState> = {
    maskAlpha: parseStringInt(params[ViewerStateKeys.Mask], 0, 100),
    imageType: parseStringEnum(params[ViewerStateKeys.Image], ImageType),
    showAxes: parseStringBoolean(params[ViewerStateKeys.Axes]),
    showBoundingBox: parseStringBoolean(params[ViewerStateKeys.BoundingBox]),
    boundingBoxColor: parseHexColorAsColorArray(params[ViewerStateKeys.BoundingBoxColor]),
    backgroundColor: parseHexColorAsColorArray(params[ViewerStateKeys.BackgroundColor]),
    autorotate: parseStringBoolean(params[ViewerStateKeys.Autorotate]),
    brightness: parseStringFloat(params[ViewerStateKeys.Brightness], 0, 100),
    density: parseStringFloat(params[ViewerStateKeys.Density], 0, 100),
    levels: parseThreeNumberArray(params[ViewerStateKeys.Levels], { min: 0, max: 255 }),
    interpolationEnabled: parseStringBoolean(params[ViewerStateKeys.Interpolation]),
    region: parseStringRegion(params[ViewerStateKeys.Region]),
    slice: parseStringSlice(params[ViewerStateKeys.Slice]),
    time: parseStringInt(params[ViewerStateKeys.Time], 0, Number.POSITIVE_INFINITY),
    scene: parseStringInt(params[ViewerStateKeys.Scene], 0, Number.POSITIVE_INFINITY),
    renderMode: parseStringEnum(params[ViewerStateKeys.Mode], RenderMode),
    singleChannelMode: parseStringBoolean(params[ViewerStateKeys.SingleChannelMode]),
    singleChannelIndex: parseStringInt(params[ViewerStateKeys.SingleChannelIndex], 0, Number.POSITIVE_INFINITY),
    useExactScaleLevel: parseStringBoolean(params[ViewerStateKeys.UseExactScaleLevel]),
    scaleLevelIndex: parseStringInt(params[ViewerStateKeys.ScaleLevelIndex], 0, Number.MAX_SAFE_INTEGER),
    cameraState: parseCameraState(params[ViewerStateKeys.CameraState]),
  };

  // Handle viewmode, since they use different mappings
  // TODO: Allow lowercase
  if (params.view) {
    const viewParamToViewMode = {
      "3D": ViewMode.threeD,
      Z: ViewMode.xy,
      Y: ViewMode.xz,
      X: ViewMode.yz,
    };
    const allowedViews = Object.keys(viewParamToViewMode);
    let view: "3D" | "X" | "Y" | "Z";
    if (allowedViews.includes(params.view.toUpperCase())) {
      view = params.view.toUpperCase() as "3D" | "X" | "Y" | "Z";
    } else {
      view = "3D";
    }
    result.viewMode = viewParamToViewMode[view];
  }

  return removeUndefinedProperties(result);
}

function parseControlPoints(controlPoints: string | undefined): ControlPoint[] | undefined {
  if (
    !(controlPoints && (CONTROL_POINTS_REGEX.test(controlPoints) || LEGACY_CONTROL_POINTS_REGEX.test(controlPoints)))
  ) {
    return undefined;
  }

  // Parse raw control point data from the string into an array of [x, opacity, color] triplets.
  let controlPointStrings: string[][];
  if (LEGACY_CONTROL_POINTS_REGEX.test(controlPoints)) {
    // Legacy format uses commas to separate control points.
    controlPointStrings = controlPoints.split(",").map((cp) => cp.split(":"));
  } else {
    // New format is all colon-separated, where every three elements represent a control point.
    controlPointStrings = controlPoints.split(":").reduce((acc, _val, i, array) => {
      if ((i + 1) % 3 === 0) {
        acc.push([array[i - 2], array[i - 1], array[i]]);
      }
      return acc;
    }, [] as string[][]);
  }

  const newControlPoints = controlPointStrings.map((cp) => {
    const [x, opacity, color] = cp;
    return {
      x: parseStringFloat(x, -Infinity, Infinity) ?? 0,
      opacity: parseStringFloat(opacity, 0, 1) ?? 1.0,
      color: parseHexColorAsColorArray(color) ?? DEFAULT_CONTROL_POINT_COLOR,
    };
  });
  // Sort control points by x value
  return newControlPoints.sort((a, b) => a.x - b.x);
}

/**
 * Parses a ViewerChannelSetting from a JSON object.
 * @param channelIndex Index of the channel, to be turned into a `match` value.
 * @param jsonState The serialized ViewerChannelSetting to parse, as an object.
 * @returns A ViewerChannelSetting object.
 */
export function deserializeViewerChannelSetting(
  channelIndex: number,
  jsonState: ViewerChannelStateParams
): ViewerChannelSetting {
  // Missing/undefined fields should be handled downstream.
  const result: ViewerChannelSetting = {
    match: channelIndex,
    enabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.VolumeEnabled]),
    surfaceEnabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.SurfaceEnabled]),
    isovalue: parseStringFloat(jsonState[ViewerChannelSettingKeys.IsosurfaceValue], -Infinity, Infinity),
    keepIntensityRange: parseStringBoolean(jsonState[ViewerChannelSettingKeys.KeepRange]),
    surfaceOpacity: parseStringFloat(jsonState[ViewerChannelSettingKeys.IsosurfaceAlpha], 0, 1),
    colorizeEnabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.Colorize]),
    colorizeAlpha: parseStringFloat(jsonState[ViewerChannelSettingKeys.ColorizeAlpha], 0, 1),
    controlPointsEnabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.ControlPointsEnabled]),
  };
  if (jsonState[ViewerChannelSettingKeys.Color] && HEX_COLOR_REGEX.test(jsonState.col)) {
    result.color = jsonState[ViewerChannelSettingKeys.Color];
  }
  if (jsonState[ViewerChannelSettingKeys.Lut] && LUT_REGEX.test(jsonState.lut)) {
    const [min, max] = jsonState[ViewerChannelSettingKeys.Lut].split(":");
    result.intensity = { ...result.intensity, lut: [min.trim(), max.trim()] };
  }

  if (jsonState[ViewerChannelSettingKeys.Ramp]) {
    if (RAMP_REGEX.test(jsonState[ViewerChannelSettingKeys.Ramp])) {
      const [min, max] = jsonState[ViewerChannelSettingKeys.Ramp].split(":");
      result.intensity = { ...result.intensity, ramp: [Number.parseFloat(min), Number.parseFloat(max)] };
    }
  } else if (jsonState[ViewerChannelSettingKeys.RampLegacy]) {
    if (RAMP_REGEX.test(jsonState[ViewerChannelSettingKeys.RampLegacy])) {
      const [min, max] = jsonState[ViewerChannelSettingKeys.RampLegacy].split(":");
      result.ramp = [Number.parseFloat(min), Number.parseFloat(max)];
    }
  }

  if (jsonState[ViewerChannelSettingKeys.ControlPoints]) {
    const parsedResult = parseControlPoints(jsonState[ViewerChannelSettingKeys.ControlPoints]);
    if (parsedResult) {
      result.intensity = { ...result.intensity, controlPoints: parsedResult };
    }
  } else if (jsonState[ViewerChannelSettingKeys.ControlPointsLegacy]) {
    const parsedResult = parseControlPoints(jsonState[ViewerChannelSettingKeys.ControlPointsLegacy]);
    if (parsedResult) {
      result.controlPoints = parsedResult;
    }
  }
  return result;
}
