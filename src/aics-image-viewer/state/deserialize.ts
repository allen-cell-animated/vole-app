import type { CameraState, ControlPoint, Histogram } from "@aics/vole-core";
import { clamp, identity } from "lodash";

import type { XYZ } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";
import { controlPointsToRamp, parseLutSetting } from "../shared/utils/controlPointsToLut";
import { removeUndefinedProperties } from "../shared/utils/datatypes";
import type { ViewerChannelSetting } from "../shared/utils/viewerChannelSettings";
import { CameraTransformKeys, ChannelStateKeys, ImageType, RenderMode, ViewerStateKeys, ViewMode } from "./types";
import type {
  CameraStateSnapshot,
  CameraStateStringified,
  ChannelState,
  ChannelStateSnapshot,
  ChannelStateStringified,
  ControlPointSnapshot,
  ViewerState,
  ViewerStateSnapshot,
  ViewerStateStringified,
} from "./types";

type Untrusted<T> = { [K in keyof T]?: unknown };

const DEFAULT_CONTROL_POINT_COLOR: [number, number, number] = [255, 255, 255];
const DEFAULT_CONTROL_POINT_COLOR_CODE = "1";

const FLOAT_REGEX = /-?[0-9]*\.?[0-9]+/;

/** Match colon-separated pairs of alphanumeric strings */
const LUT_REGEX = /^-?[a-z0-9.]*:[ ]*-?[a-z0-9.]*$/;

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
    if (splitIndex === -1) {
      continue;
    }
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
  value: unknown,
  enumValues: Record<string | number | symbol, E>,
  defaultValue: T = undefined as T
): T {
  if (typeof value !== "string" || !Object.values(enumValues).includes(value as E)) {
    return defaultValue;
  }
  return value as T;
}

const parseBoolean = (value: string): boolean | undefined => (value === "1" ? true : value === "0" ? false : undefined);

export function parseHexColorAsColorArray(hexColor: unknown): ColorArray | undefined {
  if (typeof hexColor !== "string" || !HEX_COLOR_STR_REGEX.test(hexColor)) {
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

const validateNumber = (value: unknown, min = -Infinity, max = Infinity): number | undefined => {
  return typeof value === "number" ? clamp(value, min, max) : undefined;
};

const validateInt = (value: unknown, min = -Infinity, max = Infinity): number | undefined => {
  return typeof value === "number" ? clamp(Math.floor(value), min, max) : undefined;
};

const validateBoolean = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

const validateTuple = <T, N extends number>(
  value: unknown,
  length: N,
  validator: (entry: unknown) => T | undefined
): Tuple<T, N> | undefined => {
  if (!Array.isArray(value) || value.length !== length) {
    return undefined;
  }

  const result: T[] = [];
  for (const v of value) {
    const validated = validator(v);
    if (validated === undefined) {
      return undefined;
    }
    result.push(validated);
  }

  return result as Tuple<T, N>;
};

const validateXYZ = <T>(value: unknown, validator: (entry: unknown) => T | undefined): XYZ<T> | undefined => {
  const tuple = validateTuple(value, 3, validator);

  if (tuple === undefined) {
    return undefined;
  }

  const [x, y, z] = tuple;
  return { x, y, z };
};

const validateSortedPair = (value: unknown, min?: number, max?: number): [number, number] | undefined => {
  const tuple = validateTuple(value, 2, (number) => validateNumber(number, min, max));

  if (tuple === undefined) {
    return undefined;
  }

  const [minVal, maxVal] = tuple;
  return minVal > maxVal ? [maxVal, minVal] : [minVal, maxVal];
};

const validateRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    return undefined;
  }
  if (!Object.keys(value as object).every((key) => typeof key === "string")) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

function snapshotToCameraState(snapshot: Untrusted<CameraStateSnapshot> | undefined): Partial<CameraState> | undefined {
  if (snapshot === undefined) {
    return undefined;
  }

  const result: Partial<CameraState> = {
    position: validateTuple(snapshot[CameraTransformKeys.Position], 3, validateNumber),
    target: validateTuple(snapshot[CameraTransformKeys.Target], 3, validateNumber),
    up: validateTuple(snapshot[CameraTransformKeys.Up], 3, validateNumber),
    // Orthographic scales cannot be negative
    orthoScale: validateNumber(snapshot[CameraTransformKeys.OrthoScale], 0),
    fov: validateNumber(snapshot[CameraTransformKeys.Fov], 0, 180),
  };
  return removeUndefinedProperties(result);
}

export function snapshotToViewerState(snapshot: Untrusted<ViewerStateSnapshot>): Partial<ViewerState> {
  const result: Partial<ViewerState> = {
    viewMode: parseStringEnum(snapshot[ViewerStateKeys.View], ViewMode),
    maskAlpha: validateNumber(snapshot[ViewerStateKeys.Mask], 0, 100),
    imageType: parseStringEnum(snapshot[ViewerStateKeys.Image], ImageType),
    showAxes: validateBoolean(snapshot[ViewerStateKeys.Axes]),
    showBoundingBox: validateBoolean(snapshot[ViewerStateKeys.BoundingBox]),
    boundingBoxColor: parseHexColorAsColorArray(snapshot[ViewerStateKeys.BoundingBoxColor]),
    backgroundColor: parseHexColorAsColorArray(snapshot[ViewerStateKeys.BackgroundColor]),
    autorotate: validateBoolean(snapshot[ViewerStateKeys.Autorotate]),
    brightness: validateNumber(snapshot[ViewerStateKeys.Brightness], 0, 100),
    density: validateNumber(snapshot[ViewerStateKeys.Density], 0, 100),
    levels: validateTuple(snapshot[ViewerStateKeys.Levels], 3, (value) => validateNumber(value, 0, 255)),
    interpolationEnabled: validateBoolean(snapshot[ViewerStateKeys.Interpolation]),
    region: validateXYZ(snapshot[ViewerStateKeys.Region], (value) => validateSortedPair(value, 0, 1)),
    slice: validateXYZ(snapshot[ViewerStateKeys.Slice], (value) => validateNumber(value, 0, 1)),
    time: validateInt(snapshot[ViewerStateKeys.Time], 0, Number.POSITIVE_INFINITY),
    scene: validateInt(snapshot[ViewerStateKeys.Scene], 0, Number.POSITIVE_INFINITY),
    renderMode: parseStringEnum(snapshot[ViewerStateKeys.Mode], RenderMode),
    singleChannelMode: validateBoolean(snapshot[ViewerStateKeys.SingleChannelMode]),
    singleChannelIndex: validateInt(snapshot[ViewerStateKeys.SingleChannelIndex], 0, Number.POSITIVE_INFINITY),
    useExactScaleLevel: validateBoolean(snapshot[ViewerStateKeys.UseExactScaleLevel]),
    scaleLevelIndex: validateInt(snapshot[ViewerStateKeys.ScaleLevelIndex], 0, Number.MAX_SAFE_INTEGER),
    cameraState: snapshotToCameraState(validateRecord(snapshot[ViewerStateKeys.CameraState])),
  };

  return removeUndefinedProperties(result);
}

function parseControlPointSnapshots(controlPoints: string | undefined): ControlPointSnapshot[] | undefined {
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
      color,
    };
  });
  // Sort control points by x value
  return newControlPoints.sort((a, b) => a.x - b.x);
}

function snapshotToControlPoints(controlPoints: Untrusted<ControlPointSnapshot>[]): ControlPoint[] | undefined {
  const result: ControlPoint[] = [];
  for (const point of controlPoints) {
    const x = validateNumber(point.x);
    const opacity = validateNumber(point.opacity, 0, 1);
    const color = parseHexColorAsColorArray(point.color) ?? [...DEFAULT_CONTROL_POINT_COLOR];
    if (x === undefined || opacity === undefined || color === undefined) {
      return undefined;
    }
    result.push({ x, opacity, color });
  }
  return result;
}

/**
 * Parses a ViewerChannelSetting from a JSON object.
 * @param channelIndex Index of the channel, to be turned into a `match` value.
 * @param jsonState The serialized ViewerChannelSetting to parse, as an object.
 * @returns A ViewerChannelSetting object.
 */
export function snapshotToViewerChannelSetting(
  channelIndex: number,
  jsonState: Untrusted<ChannelStateSnapshot>
): ViewerChannelSetting {
  // Missing/undefined fields should be handled downstream.
  const result: ViewerChannelSetting = {
    match: channelIndex,
    enabled: validateBoolean(jsonState[ChannelStateKeys.VolumeEnabled]),
    surfaceEnabled: validateBoolean(jsonState[ChannelStateKeys.SurfaceEnabled]),
    isovalue: validateNumber(jsonState[ChannelStateKeys.IsosurfaceValue], -Infinity, Infinity),
    keepIntensityRange: validateBoolean(jsonState[ChannelStateKeys.KeepRange]),
    surfaceOpacity: validateNumber(jsonState[ChannelStateKeys.IsosurfaceAlpha], 0, 1),
    colorizeEnabled: validateBoolean(jsonState[ChannelStateKeys.Colorize]),
    colorizeAlpha: validateNumber(jsonState[ChannelStateKeys.ColorizeAlpha], 0, 1),
    controlPointsEnabled: validateBoolean(jsonState[ChannelStateKeys.ControlPointsEnabled]),
  };
  if (typeof jsonState[ChannelStateKeys.Color] === "string" && HEX_COLOR_STR_REGEX.test(jsonState.col)) {
    result.color = jsonState[ChannelStateKeys.Color];
  }

  const lut = validateTuple<string | number, 2>(jsonState[ChannelStateKeys.Lut], 2, identity);
  if (lut !== undefined) {
    result.intensity = { ...result.intensity, lut };
  }

  if (jsonState[ChannelStateKeys.Ramp]) {
    const ramp = validateSortedPair(jsonState[ChannelStateKeys.Ramp]);
    if (ramp !== undefined) {
      result.intensity = { ...result.intensity, ramp };
    }
  } else if (jsonState[ChannelStateKeys.RampLegacy]) {
    const ramp = validateSortedPair(jsonState[ChannelStateKeys.Ramp]);
    if (ramp !== undefined) {
      result.ramp = ramp;
    }
  }

  if (Array.isArray(jsonState[ChannelStateKeys.ControlPoints])) {
    const parsedResult = snapshotToControlPoints(jsonState[ChannelStateKeys.ControlPoints]);
    if (parsedResult) {
      result.intensity = { ...result.intensity, controlPoints: parsedResult };
    }
  } else if (Array.isArray(jsonState[ChannelStateKeys.ControlPointsLegacy])) {
    const parsedResult = snapshotToControlPoints(jsonState[ChannelStateKeys.ControlPointsLegacy]);
    if (parsedResult) {
      result.controlPoints = parsedResult;
    }
  }
  return result;
}

/**
 * Parses a `ViewerChannelStateParams` object into a partial `ChannelState`.
 *
 * This is used to convert raw URL params into internal channel state fields,
 * leaving absent or invalid values undefined.
 *
 * This function optionally accepts the target channel's `Histogram`. This
 * argument is required to parse the following params correctly:
 *
 * - `lut`, which contains instructions for how to set the channel's
 *   intensities *relative to its intensity distribution*.
 * - `rmp`, the legacy ramp parameter represented as histogram bin indices
 * - `cps`, the legacy control points parameter where `x` values are
 *   represented as histogram bin indices
 *
 * If `histogram` is left undefined, e.g. because the channel has not yet been
 * loaded, these params are ignored.
 */
export function snapshotToChannelState(
  jsonState: Untrusted<ChannelStateSnapshot>,
  histogram?: Histogram
): Partial<ChannelState> {
  const result: Partial<ChannelState> = {
    volumeEnabled: validateBoolean(jsonState[ChannelStateKeys.VolumeEnabled]),
    isosurfaceEnabled: validateBoolean(jsonState[ChannelStateKeys.SurfaceEnabled]),
    isovalue: validateNumber(jsonState[ChannelStateKeys.IsosurfaceValue], -Infinity, Infinity),
    keepIntensityRange: validateBoolean(jsonState[ChannelStateKeys.KeepRange]),
    opacity: validateNumber(jsonState[ChannelStateKeys.IsosurfaceAlpha], 0, 1),
    colorizeEnabled: validateBoolean(jsonState[ChannelStateKeys.Colorize]),
    colorizeAlpha: validateNumber(jsonState[ChannelStateKeys.ColorizeAlpha], 0, 1),
    useControlPoints: validateBoolean(jsonState[ChannelStateKeys.ControlPointsEnabled]),
    color: parseHexColorAsColorArray(jsonState[ChannelStateKeys.Color]),
  };

  const lutRaw = validateTuple<string | number, 2>(jsonState[ChannelStateKeys.Lut], 2, identity);
  let pointsFromLut: ControlPoint[] | undefined = undefined;
  if (histogram !== undefined && lutRaw !== undefined) {
    const lut = parseLutSetting(histogram, lutRaw);
    pointsFromLut = lut?.controlPoints.map((point) => ({
      ...point,
      x: histogram.getValueFromBinIndex(point.x),
    }));
  }

  if (jsonState[ChannelStateKeys.Ramp]) {
    const ramp = validateSortedPair(jsonState[ChannelStateKeys.Ramp]);
    if (ramp !== undefined) {
      result.ramp = ramp;
    }
  } else if (jsonState[ChannelStateKeys.RampLegacy]) {
    const ramp = validateSortedPair(jsonState[ChannelStateKeys.RampLegacy]);
    if (histogram !== undefined && ramp !== undefined) {
      const [rawMin, rawMax] = ramp;
      const min = histogram.getValueFromBinIndex(rawMin);
      const max = histogram.getValueFromBinIndex(rawMax);
      result.ramp = [min, max];
    }
  } else if (pointsFromLut !== undefined) {
    result.ramp = controlPointsToRamp(pointsFromLut);
  }

  if (Array.isArray(jsonState[ChannelStateKeys.ControlPoints])) {
    const parsedResult = snapshotToControlPoints(jsonState[ChannelStateKeys.ControlPoints]);
    if (parsedResult) {
      result.controlPoints = parsedResult;
    }
  } else if (Array.isArray(jsonState[ChannelStateKeys.ControlPointsLegacy])) {
    if (histogram !== undefined) {
      const parsedResult = snapshotToControlPoints(jsonState[ChannelStateKeys.ControlPointsLegacy]);
      if (parsedResult) {
        result.controlPoints = parsedResult.map(({ opacity, color, x }) => ({
          opacity,
          color,
          x: histogram.getValueFromBinIndex(x),
        }));
      }
    }
  } else if (pointsFromLut !== undefined) {
    result.controlPoints = pointsFromLut;
  }

  return removeUndefinedProperties(result);
}

/**
 * Helper function for parsing all keys of a stringified object back to their proper types.
 *
 * Accepts an object with string keys, and a map of parsers that convert the keys to their proper types.
 */
const parse = <T extends Record<string, unknown>>(
  stringified: Partial<Record<keyof T, string>>,
  parsers: { [K in keyof Required<T>]: (value: string) => T[K] | undefined }
): Partial<T> => {
  const result: Partial<T> = {};

  for (const k of Object.keys(parsers)) {
    const key = k as keyof T;
    const parser = parsers[key];
    const stringValue = stringified[key];

    if (stringValue !== undefined) {
      const parsed = parser(stringValue);
      if (parsed !== undefined && !Number.isNaN(parsed)) {
        result[key] = parsed;
      }
    }
  }

  return result;
};

// adapted from https://github.com/microsoft/TypeScript/pull/40002
type Tuple<T, N extends number, R extends T[] = []> = R["length"] extends N ? R : Tuple<T, N, [T, ...R]>;

const tupleParser = <N extends number, T = string>(
  length: N,
  delimiter = ":",
  itemParser: (item: string) => T | undefined = identity
): ((stringified: string) => Tuple<T, N> | undefined) => {
  return (stringified) => {
    const split = stringified.split(delimiter);

    if (split.length !== length) {
      return undefined;
    }

    const result = [];
    for (const value of split) {
      const parsedValue = itemParser(value.trim());
      if (parsedValue === undefined || Number.isNaN(parsedValue)) {
        return undefined;
      }

      result.push(parsedValue);
    }

    return result as Tuple<T, N>;
  };
};

export const parseCameraStateSnapshot = (stringified: CameraStateStringified): CameraStateSnapshot =>
  parse<CameraStateSnapshot>(stringified, {
    [CameraTransformKeys.Position]: tupleParser(3, ":", Number.parseFloat),
    [CameraTransformKeys.Target]: tupleParser(3, ":", Number.parseFloat),
    [CameraTransformKeys.Up]: tupleParser(3, ":", Number.parseFloat),
    [CameraTransformKeys.OrthoScale]: Number.parseFloat,
    [CameraTransformKeys.Fov]: Number.parseFloat,
  });

const VIEW_PARAM_TO_VIEW_MODE = {
  "3d": ViewMode.threeD,
  x: ViewMode.yz,
  y: ViewMode.xz,
  z: ViewMode.xy,
};

export const parseViewerStateSnapshot = (stringified: ViewerStateStringified): ViewerStateSnapshot =>
  parse<ViewerStateSnapshot>(stringified, {
    [ViewerStateKeys.View]: (value) =>
      VIEW_PARAM_TO_VIEW_MODE[value.toLowerCase() as keyof typeof VIEW_PARAM_TO_VIEW_MODE],
    [ViewerStateKeys.Mode]: (value) => parseStringEnum(value, RenderMode),
    [ViewerStateKeys.Mask]: Number.parseFloat,
    [ViewerStateKeys.Image]: (value) => parseStringEnum(value, ImageType),
    [ViewerStateKeys.Axes]: parseBoolean,
    [ViewerStateKeys.BoundingBox]: parseBoolean,
    [ViewerStateKeys.BoundingBoxColor]: identity,
    [ViewerStateKeys.BackgroundColor]: identity,
    [ViewerStateKeys.Autorotate]: parseBoolean,
    [ViewerStateKeys.Brightness]: Number.parseFloat,
    [ViewerStateKeys.Density]: Number.parseFloat,
    [ViewerStateKeys.Levels]: tupleParser(3, ",", Number.parseFloat),
    [ViewerStateKeys.Interpolation]: parseBoolean,
    [ViewerStateKeys.Region]: tupleParser(3, ",", tupleParser(2, ":", Number.parseFloat)),
    [ViewerStateKeys.Slice]: tupleParser(3, ",", Number.parseFloat),
    [ViewerStateKeys.Time]: Number.parseInt,
    [ViewerStateKeys.Scene]: Number.parseInt,
    [ViewerStateKeys.CameraState]: (cameraString) => parseCameraStateSnapshot(parseKeyValueList(cameraString)),
    [ViewerStateKeys.SingleChannelMode]: parseBoolean,
    [ViewerStateKeys.SingleChannelIndex]: Number.parseInt,
    [ViewerStateKeys.UseExactScaleLevel]: parseBoolean,
    [ViewerStateKeys.ScaleLevelIndex]: Number.parseInt,
  });

export const parseChannelStateSnapshot = (stringified: ChannelStateStringified): ChannelStateSnapshot =>
  parse<ChannelStateSnapshot>(stringified, {
    [ChannelStateKeys.Color]: identity,
    [ChannelStateKeys.Colorize]: parseBoolean,
    [ChannelStateKeys.ColorizeAlpha]: Number.parseFloat,
    [ChannelStateKeys.IsosurfaceAlpha]: Number.parseFloat,
    [ChannelStateKeys.Lut]: tupleParser(2),
    [ChannelStateKeys.ControlPoints]: parseControlPointSnapshots,
    [ChannelStateKeys.ControlPointsLegacy]: parseControlPointSnapshots,
    [ChannelStateKeys.Ramp]: tupleParser(2, ":", Number.parseFloat),
    [ChannelStateKeys.RampLegacy]: tupleParser(2, ":", Number.parseFloat),
    [ChannelStateKeys.ControlPointsEnabled]: parseBoolean,
    [ChannelStateKeys.VolumeEnabled]: parseBoolean,
    [ChannelStateKeys.SurfaceEnabled]: parseBoolean,
    [ChannelStateKeys.IsosurfaceValue]: Number.parseFloat,
    [ChannelStateKeys.KeepRange]: parseBoolean,
  });

export const deserializeViewerState = (stringified: ViewerStateStringified): Partial<ViewerState> =>
  snapshotToViewerState(parseViewerStateSnapshot(stringified));

export const deserializeChannelState = (
  jsonState: ChannelStateStringified,
  histogram?: Histogram
): Partial<ChannelState> => snapshotToChannelState(parseChannelStateSnapshot(jsonState), histogram);

export const deserializeViewerChannelSetting = (
  channelIndex: number,
  jsonState: ChannelStateStringified
): ViewerChannelSetting => snapshotToViewerChannelSetting(channelIndex, parseChannelStateSnapshot(jsonState));
