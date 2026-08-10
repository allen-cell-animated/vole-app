import type { CameraState, ControlPoint, Histogram } from "@aics/vole-core";
import { clamp, identity } from "lodash";

import type { XYZ } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";
import { controlPointsToRamp, parseLutSetting } from "../shared/utils/controlPointsToLut";
import { removeUndefinedProperties } from "../shared/utils/datatypes";
import type { ViewerChannelSetting } from "../shared/utils/viewerChannelSettings";
import {
  CameraTransformKeys,
  ChannelStateSnapshotKeys,
  ImageType,
  RenderMode,
  ViewerStateSnapshotKeys,
  ViewMode,
} from "./types";
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

const DEFAULT_CONTROL_POINT_COLOR: [number, number, number] = [255, 255, 255];
const DEFAULT_CONTROL_POINT_COLOR_CODE = "1";

const FLOAT_REGEX = /-?[0-9]*\.?[0-9]+/;

/**
 * A valid lut specifier for `ViewerChannelSettings` is a float optionally prefixed with one of `v`, `p`, or `m`, or
 * the string `autoij`.
 */
const LUT_VALUE_REGEX = new RegExp(`^([vpm]?${FLOAT_REGEX.source}|autoij)$`);

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

// adapted from https://github.com/microsoft/TypeScript/pull/40002
type Tuple<T, N extends number, R extends T[] = []> = R["length"] extends N ? R : Tuple<T, N, [T, ...R]>;

// MARK: Destringifiers

/**
 * Creates a function that parses a string into a list of exactly `length` items split by `delimiter`,
 * with each item further parsed by `itemParser`; or returns `undefined` if parsing failed.
 */
const tupleParser = <N extends number, T = string>(
  length: N,
  itemParser: (item: string) => T | undefined = identity,
  delimiter = ":"
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
      x: Number.parseFloat(x),
      opacity: Number.parseFloat(opacity),
      color,
    };
  });
  return newControlPoints;
}

const parseBoolean = (value: string): boolean | undefined => (value === "1" ? true : value === "0" ? false : undefined);

/**
 * Helper function for parsing all keys of a stringified object back to their
 * proper types.
 *
 * Accepts an object with string keys, and a map of parsers that convert the
 * keys to their proper types, or return `undefined` when parsing fails.
 */
const destringify = <T extends Record<string, unknown>>(
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

/**
 * Converts a `CameraStateStringified` into a `CameraStateSnapshot` by parsing each key from its stringified
 * representation to its type in `CameraStateSnapshot`.
 */
export const destringifyCameraStateSnapshot = (stringified: CameraStateStringified): CameraStateSnapshot =>
  destringify<CameraStateSnapshot>(stringified, {
    [CameraTransformKeys.Position]: tupleParser(3, Number.parseFloat),
    [CameraTransformKeys.Target]: tupleParser(3, Number.parseFloat),
    [CameraTransformKeys.Up]: tupleParser(3, Number.parseFloat),
    [CameraTransformKeys.OrthoScale]: Number.parseFloat,
    [CameraTransformKeys.Fov]: Number.parseFloat,
  });

const VIEW_PARAM_TO_VIEW_MODE = {
  "3d": ViewMode.threeD,
  x: ViewMode.yz,
  y: ViewMode.xz,
  z: ViewMode.xy,
};

/**
 * Converts a `ViewerStateStringified` into a `ViewerStateSnapshot` by parsing each key from its stringified
 * representation to its type in `ViewerStateSnapshot`.
 */
export const destringifyViewerStateSnapshot = (stringified: ViewerStateStringified): ViewerStateSnapshot =>
  destringify<ViewerStateSnapshot>(stringified, {
    [ViewerStateSnapshotKeys.View]: (value) =>
      VIEW_PARAM_TO_VIEW_MODE[value.toLowerCase() as keyof typeof VIEW_PARAM_TO_VIEW_MODE],
    [ViewerStateSnapshotKeys.Mode]: (value) => parseStringEnum(value, RenderMode),
    [ViewerStateSnapshotKeys.Mask]: Number.parseFloat,
    [ViewerStateSnapshotKeys.Image]: (value) => parseStringEnum(value, ImageType),
    [ViewerStateSnapshotKeys.Axes]: parseBoolean,
    [ViewerStateSnapshotKeys.BoundingBox]: parseBoolean,
    [ViewerStateSnapshotKeys.BoundingBoxColor]: identity,
    [ViewerStateSnapshotKeys.BackgroundColor]: identity,
    [ViewerStateSnapshotKeys.Autorotate]: parseBoolean,
    [ViewerStateSnapshotKeys.Brightness]: Number.parseFloat,
    [ViewerStateSnapshotKeys.Density]: Number.parseFloat,
    [ViewerStateSnapshotKeys.Levels]: tupleParser(3, Number.parseFloat, ","),
    [ViewerStateSnapshotKeys.Interpolation]: parseBoolean,
    [ViewerStateSnapshotKeys.Region]: tupleParser(3, tupleParser(2, Number.parseFloat), ","),
    [ViewerStateSnapshotKeys.Slice]: tupleParser(3, Number.parseFloat, ","),
    [ViewerStateSnapshotKeys.Time]: Number.parseInt,
    [ViewerStateSnapshotKeys.Scene]: Number.parseInt,
    [ViewerStateSnapshotKeys.CameraState]: (cameraString) =>
      destringifyCameraStateSnapshot(parseKeyValueList(cameraString)),
    [ViewerStateSnapshotKeys.SingleChannelMode]: parseBoolean,
    [ViewerStateSnapshotKeys.SingleChannelIndex]: Number.parseInt,
    [ViewerStateSnapshotKeys.UseExactScaleLevel]: parseBoolean,
    [ViewerStateSnapshotKeys.ScaleLevelIndex]: Number.parseInt,
  });

/**
 * Converts a `ChannelStateStringified` into a `ChannelStateSnapshot` by parsing each key from its stringified
 * representation to its type in `ChannelStateSnapshot`.
 */
export const destringifyChannelStateSnapshot = (stringified: ChannelStateStringified): ChannelStateSnapshot =>
  destringify<ChannelStateSnapshot>(stringified, {
    [ChannelStateSnapshotKeys.Color]: identity,
    [ChannelStateSnapshotKeys.Colorize]: parseBoolean,
    [ChannelStateSnapshotKeys.ColorizeAlpha]: Number.parseFloat,
    [ChannelStateSnapshotKeys.IsosurfaceAlpha]: Number.parseFloat,
    [ChannelStateSnapshotKeys.Lut]: tupleParser(2),
    [ChannelStateSnapshotKeys.ControlPoints]: parseControlPointSnapshots,
    [ChannelStateSnapshotKeys.ControlPointsLegacy]: parseControlPointSnapshots,
    [ChannelStateSnapshotKeys.Ramp]: tupleParser(2, Number.parseFloat),
    [ChannelStateSnapshotKeys.RampLegacy]: tupleParser(2, Number.parseFloat),
    [ChannelStateSnapshotKeys.ControlPointsEnabled]: parseBoolean,
    [ChannelStateSnapshotKeys.VolumeEnabled]: parseBoolean,
    [ChannelStateSnapshotKeys.SurfaceEnabled]: parseBoolean,
    [ChannelStateSnapshotKeys.IsosurfaceValue]: Number.parseFloat,
    [ChannelStateSnapshotKeys.KeepRange]: parseBoolean,
  });

// MARK: Parsing Helpers

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

/** Verifies that a value is a number; if it is, clamps it between `min` and `max`. */
export const validateNumber = (value: unknown, min = -Infinity, max = Infinity): number | undefined => {
  return typeof value === "number" && !Number.isNaN(value) ? clamp(value, min, max) : undefined;
};

/** Verifies that a value is a number; if it is, truncates it to an integer and clamps it between `min` and `max`. */
export const validateInt = (value: unknown, min = -Infinity, max = Infinity): number | undefined => {
  return typeof value === "number" && !Number.isNaN(value) ? clamp(Math.trunc(value), min, max) : undefined;
};

/** Verifies that a value is a `boolean`. */
const validateBoolean = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

/** Verifies that `value` is a list of length `length` and that all its items are valid per `validator`. */
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

/**
 * Verifies that `value` is a three-element array whose items are valid per `validator`;
 * if it is, converts it to an object with the form `{ x, y, z }`
 */
const validateXYZ = <T>(value: unknown, validator: (entry: unknown) => T | undefined): XYZ<T> | undefined => {
  const tuple = validateTuple(value, 3, validator);

  if (tuple === undefined) {
    return undefined;
  }

  const [x, y, z] = tuple;
  return { x, y, z };
};

/**
 * Verifies that `value` is a two-element array of numbers, clamps both numbers between `min` and `max`,
 * then sorts the numbers.
 */
const validateSortedPair = (value: unknown, min?: number, max?: number): [number, number] | undefined => {
  const tuple = validateTuple(value, 2, (number) => validateNumber(number, min, max));

  if (tuple === undefined) {
    return undefined;
  }

  const [minVal, maxVal] = tuple;
  return minVal > maxVal ? [maxVal, minVal] : [minVal, maxVal];
};

/** Verifies that `value` is an object with `string` keys. */
const validateRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value !== "object" || Array.isArray(value) || value === null) {
    return undefined;
  }
  if (!Object.keys(value as object).every((key) => typeof key === "string")) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

/** Verifies that `value` is a valid lut specifier per `ViewerChannelSettings`. */
const validateLutValue = (value: unknown): string | number | undefined => {
  if (typeof value === "number") {
    return clamp(value, 0, 255);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const result = value.trim().toLowerCase();
  if (LUT_VALUE_REGEX.test(result)) {
    return result;
  }

  return undefined;
};

// MARK: Parsers

type Untrusted<T> = { [K in keyof T]?: unknown };

/** Parses a `CameraStateSnapshot` to a `CameraState`. */
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

/** Parses a `ViewerStateSnapshot` to a `ViewerState`. */
export function snapshotToViewerState(snapshot: Untrusted<ViewerStateSnapshot>): Partial<ViewerState> {
  const result: Partial<ViewerState> = {
    viewMode: parseStringEnum(snapshot[ViewerStateSnapshotKeys.View], ViewMode),
    maskAlpha: validateNumber(snapshot[ViewerStateSnapshotKeys.Mask], 0, 100),
    imageType: parseStringEnum(snapshot[ViewerStateSnapshotKeys.Image], ImageType),
    showAxes: validateBoolean(snapshot[ViewerStateSnapshotKeys.Axes]),
    showBoundingBox: validateBoolean(snapshot[ViewerStateSnapshotKeys.BoundingBox]),
    boundingBoxColor: parseHexColorAsColorArray(snapshot[ViewerStateSnapshotKeys.BoundingBoxColor]),
    backgroundColor: parseHexColorAsColorArray(snapshot[ViewerStateSnapshotKeys.BackgroundColor]),
    autorotate: validateBoolean(snapshot[ViewerStateSnapshotKeys.Autorotate]),
    brightness: validateNumber(snapshot[ViewerStateSnapshotKeys.Brightness], 0, 100),
    density: validateNumber(snapshot[ViewerStateSnapshotKeys.Density], 0, 100),
    levels: validateTuple(snapshot[ViewerStateSnapshotKeys.Levels], 3, (value) => validateNumber(value, 0, 255)),
    interpolationEnabled: validateBoolean(snapshot[ViewerStateSnapshotKeys.Interpolation]),
    region: validateXYZ(snapshot[ViewerStateSnapshotKeys.Region], (value) => validateSortedPair(value, 0, 1)),
    slice: validateXYZ(snapshot[ViewerStateSnapshotKeys.Slice], (value) => validateNumber(value, 0, 1)),
    time: validateInt(snapshot[ViewerStateSnapshotKeys.Time], 0, Number.POSITIVE_INFINITY),
    scene: validateInt(snapshot[ViewerStateSnapshotKeys.Scene], 0, Number.POSITIVE_INFINITY),
    renderMode: parseStringEnum(snapshot[ViewerStateSnapshotKeys.Mode], RenderMode),
    singleChannelMode: validateBoolean(snapshot[ViewerStateSnapshotKeys.SingleChannelMode]),
    singleChannelIndex: validateInt(snapshot[ViewerStateSnapshotKeys.SingleChannelIndex], 0, Number.POSITIVE_INFINITY),
    useExactScaleLevel: validateBoolean(snapshot[ViewerStateSnapshotKeys.UseExactScaleLevel]),
    scaleLevelIndex: validateInt(snapshot[ViewerStateSnapshotKeys.ScaleLevelIndex], 0, Number.MAX_SAFE_INTEGER),
    cameraState: snapshotToCameraState(validateRecord(snapshot[ViewerStateSnapshotKeys.CameraState])),
  };

  return removeUndefinedProperties(result);
}

/** Attempts to parse an array of `ControlPointSnapshot`s to an array of `ControlPoint`s. */
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
  // Sort control points by x value
  return result.sort((a, b) => a.x - b.x);
}

/**
 * Parses a `ChannelStateSnapshot` to a `ViewerChannelSetting`.
 * @param channelIndex Index of the channel, to be turned into a `match` value.
 * @param jsonState The serialized `ViewerChannelSetting` to parse, as an object.
 * @returns A `ViewerChannelSetting` object.
 */
export function snapshotToViewerChannelSetting(
  channelIndex: number,
  jsonState: Untrusted<ChannelStateSnapshot>
): ViewerChannelSetting {
  // Missing/undefined fields should be handled downstream.
  const result: ViewerChannelSetting = {
    match: channelIndex,
    enabled: validateBoolean(jsonState[ChannelStateSnapshotKeys.VolumeEnabled]),
    surfaceEnabled: validateBoolean(jsonState[ChannelStateSnapshotKeys.SurfaceEnabled]),
    isovalue: validateNumber(jsonState[ChannelStateSnapshotKeys.IsosurfaceValue], -Infinity, Infinity),
    keepIntensityRange: validateBoolean(jsonState[ChannelStateSnapshotKeys.KeepRange]),
    surfaceOpacity: validateNumber(jsonState[ChannelStateSnapshotKeys.IsosurfaceAlpha], 0, 1),
    colorizeEnabled: validateBoolean(jsonState[ChannelStateSnapshotKeys.Colorize]),
    colorizeAlpha: validateNumber(jsonState[ChannelStateSnapshotKeys.ColorizeAlpha], 0, 1),
    controlPointsEnabled: validateBoolean(jsonState[ChannelStateSnapshotKeys.ControlPointsEnabled]),
  };
  const color = jsonState[ChannelStateSnapshotKeys.Color];
  if (typeof color === "string" && HEX_COLOR_STR_REGEX.test(color)) {
    result.color = color;
  }

  const lut = validateTuple<string | number, 2>(jsonState[ChannelStateSnapshotKeys.Lut], 2, identity);
  if (lut !== undefined) {
    result.intensity = { ...result.intensity, lut };
  }

  if (jsonState[ChannelStateSnapshotKeys.Ramp]) {
    const ramp = validateSortedPair(jsonState[ChannelStateSnapshotKeys.Ramp]);
    if (ramp !== undefined) {
      result.intensity = { ...result.intensity, ramp };
    }
  } else if (jsonState[ChannelStateSnapshotKeys.RampLegacy]) {
    const ramp = validateSortedPair(jsonState[ChannelStateSnapshotKeys.Ramp]);
    if (ramp !== undefined) {
      result.ramp = ramp;
    }
  }

  if (Array.isArray(jsonState[ChannelStateSnapshotKeys.ControlPoints])) {
    const parsedResult = snapshotToControlPoints(jsonState[ChannelStateSnapshotKeys.ControlPoints]);
    if (parsedResult) {
      result.intensity = { ...result.intensity, controlPoints: parsedResult };
    }
  } else if (Array.isArray(jsonState[ChannelStateSnapshotKeys.ControlPointsLegacy])) {
    const parsedResult = snapshotToControlPoints(jsonState[ChannelStateSnapshotKeys.ControlPointsLegacy]);
    if (parsedResult) {
      result.controlPoints = parsedResult;
    }
  }
  return result;
}

/**
 * Parses a `ChannelStateSnapshot` object into a partial `ChannelState`.
 *
 * This is used to convert from serialized formats (URL params, JSON) into
 * internal channel state fields, leaving absent or invalid values undefined.
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
    volumeEnabled: validateBoolean(jsonState[ChannelStateSnapshotKeys.VolumeEnabled]),
    isosurfaceEnabled: validateBoolean(jsonState[ChannelStateSnapshotKeys.SurfaceEnabled]),
    isovalue: validateNumber(jsonState[ChannelStateSnapshotKeys.IsosurfaceValue], -Infinity, Infinity),
    keepIntensityRange: validateBoolean(jsonState[ChannelStateSnapshotKeys.KeepRange]),
    opacity: validateNumber(jsonState[ChannelStateSnapshotKeys.IsosurfaceAlpha], 0, 1),
    colorizeEnabled: validateBoolean(jsonState[ChannelStateSnapshotKeys.Colorize]),
    colorizeAlpha: validateNumber(jsonState[ChannelStateSnapshotKeys.ColorizeAlpha], 0, 1),
    useControlPoints: validateBoolean(jsonState[ChannelStateSnapshotKeys.ControlPointsEnabled]),
    color: parseHexColorAsColorArray(jsonState[ChannelStateSnapshotKeys.Color]),
  };

  const lutRaw = validateTuple(jsonState[ChannelStateSnapshotKeys.Lut], 2, validateLutValue);
  let pointsFromLut: ControlPoint[] | undefined = undefined;
  if (histogram !== undefined && lutRaw !== undefined) {
    const lut = parseLutSetting(histogram, lutRaw);
    pointsFromLut = lut?.controlPoints.map((point) => ({
      ...point,
      x: histogram.getValueFromBinIndex(point.x),
    }));
  }

  if (jsonState[ChannelStateSnapshotKeys.Ramp]) {
    const ramp = validateSortedPair(jsonState[ChannelStateSnapshotKeys.Ramp]);
    if (ramp !== undefined) {
      result.ramp = ramp;
    }
  } else if (jsonState[ChannelStateSnapshotKeys.RampLegacy]) {
    const ramp = validateSortedPair(jsonState[ChannelStateSnapshotKeys.RampLegacy]);
    if (histogram !== undefined && ramp !== undefined) {
      const [rawMin, rawMax] = ramp;
      const min = histogram.getValueFromBinIndex(rawMin);
      const max = histogram.getValueFromBinIndex(rawMax);
      result.ramp = [min, max];
    }
  } else if (pointsFromLut !== undefined) {
    result.ramp = controlPointsToRamp(pointsFromLut);
  }

  if (Array.isArray(jsonState[ChannelStateSnapshotKeys.ControlPoints])) {
    const parsedResult = snapshotToControlPoints(jsonState[ChannelStateSnapshotKeys.ControlPoints]);
    if (parsedResult) {
      result.controlPoints = parsedResult;
    }
  } else if (Array.isArray(jsonState[ChannelStateSnapshotKeys.ControlPointsLegacy])) {
    if (histogram !== undefined) {
      const parsedResult = snapshotToControlPoints(jsonState[ChannelStateSnapshotKeys.ControlPointsLegacy]);
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
 * Parses a stringified viewer state snapshot (`ViewerStateStringified`) to a
 * `ViewerState`.
 *
 * This is equivalent to (and implemented by) calling
 * `destringifyViewerStateSnapshot`, then `snapshotToViewerState`.
 */
export const stringSnapshotToViewerState = (stringified: ViewerStateStringified): Partial<ViewerState> =>
  snapshotToViewerState(destringifyViewerStateSnapshot(stringified));

/**
 * Parses a stringified channel state snapshot (`ChannelStateStringified`) to a
 * `ViewerChannelSetting`.
 *
 * This is equivalent to (and implemented by) calling
 * `destringifyChannelStateSnapshot`, then `snapshotToViewerChannelSetting`.
 *
 * @param channelIndex Index of the channel, to be turned into a `match` value.
 * @param jsonState The serialized `ViewerChannelSetting` to parse, as an object.
 * @returns A `ViewerChannelSetting` object.
 */
export const stringSnapshotToViewerChannelSetting = (
  channelIndex: number,
  jsonState: ChannelStateStringified
): ViewerChannelSetting => snapshotToViewerChannelSetting(channelIndex, destringifyChannelStateSnapshot(jsonState));

/**
 * Parses a stringified channel state snapshot (`ChannelStateStringified`)
 * into a partial `ChannelState`.
 *
 * This is equivalent to (and implemented by) calling
 * `destringifyChannelStateSnapshot`, then `snapshotToChannelState`.
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
export const stringSnapshotToChannelState = (
  jsonState: ChannelStateStringified,
  histogram?: Histogram
): Partial<ChannelState> => snapshotToChannelState(destringifyChannelStateSnapshot(jsonState), histogram);
