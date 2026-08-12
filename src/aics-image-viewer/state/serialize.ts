import type { CameraState, ControlPoint } from "@aics/vole-core";
import { identity, isEqual } from "lodash";

import { getDefaultCameraState, getDefaultChannelState, getDefaultViewerState } from "../shared/constants";
import type { XYZ } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";
import { removeMatchingProperties, removeUndefinedProperties } from "../shared/utils/datatypes";
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
import { ImageType, ImageTypeSnapshot, RenderModeSnapshot } from "./types";
import {
  CameraTransformKeys,
  ChannelStateKeys,
  RenderMode,
  ViewerStateKeys,
  ViewMode,
  ViewModeSnapshot,
} from "./types";

const ENCODED_COLON_REGEX = /%3A/g;

const DEFAULT_CONTROL_POINT_COLOR: [number, number, number] = [255, 255, 255];
const DEFAULT_CONTROL_POINT_COLOR_CODE = "1";

/**
 * Serializes an object with `string` keys to a compact `string` representation, where keys and values are separated
 * by colons (`:`) and entries are separated by commas (`,`).
 */
export function objectToKeyValueList(obj: Record<string, string | undefined>): string {
  const keyValuePairs: string[] = [];
  for (const key in obj) {
    const value = obj[key];
    if (value === undefined) {
      continue;
    }
    // Allow colon separators to remain unencoded to save URL character length.
    const escapedValue = encodeURIComponent(value.trim()).replace(ENCODED_COLON_REGEX, ":");
    keyValuePairs.push(`${encodeURIComponent(key.trim())}:${escapedValue}`);
  }
  return keyValuePairs.join(",");
}

function colorArrayToHex(color: ColorArray): string {
  return color
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();
}

const xyzToArray = <T>({ x, y, z }: XYZ<T>): [T, T, T] => [x, y, z];

/**
 * Converts a `CameraState` to a `CameraStateSnapshot`, suitable for serialization.
 * @param cameraState The camera state to serialize.
 * @param removeDefaults Whether to remove default values.
 * @param viewMode The current view mode. Default `ViewMode.threeD`.
 * @returns The resulting `CameraStateSnapshot`, or `undefined` if all values are default.
 */
export function cameraStateToSnapshot(
  cameraState: Partial<CameraState> | undefined,
  removeDefaults: boolean,
  viewMode: ViewMode = ViewMode.threeD
): CameraStateSnapshot | undefined {
  if (cameraState === undefined) {
    return undefined;
  }

  // Note that we use the `getDefaultCameraState()` to get the defaults here,
  // instead of `getDefaultViewerState().cameraState`. The latter is undefined, which signals
  // that the camera should not be modified for URLs that don't specify it.
  const modifiedState = removeDefaults
    ? removeMatchingProperties(cameraState, getDefaultCameraState(viewMode))
    : cameraState;

  const snapshot: CameraStateSnapshot = removeUndefinedProperties({
    [CameraTransformKeys.Position]: modifiedState.position && [...modifiedState.position],
    [CameraTransformKeys.Target]: modifiedState.target && [...modifiedState.target],
    [CameraTransformKeys.Up]: modifiedState.up && [...modifiedState.up],
    [CameraTransformKeys.OrthoScale]: modifiedState.orthoScale,
    [CameraTransformKeys.Fov]: modifiedState.fov,
  });

  if (Object.keys(snapshot).length === 0) {
    return undefined;
  }

  return snapshot;
}

function controlPointToSnapshot(controlPoint: ControlPoint): ControlPointSnapshot {
  return {
    x: controlPoint.x,
    opacity: controlPoint.opacity,
    color: isEqual(controlPoint.color, DEFAULT_CONTROL_POINT_COLOR)
      ? DEFAULT_CONTROL_POINT_COLOR_CODE
      : colorArrayToHex(controlPoint.color),
  };
}

const VIEW_MODE_TO_SNAPSHOT: { [K in ViewMode]: ViewModeSnapshot } = {
  [ViewMode.threeD]: ViewModeSnapshot.threeD,
  [ViewMode.xy]: ViewModeSnapshot.xy,
  [ViewMode.xz]: ViewModeSnapshot.xz,
  [ViewMode.yz]: ViewModeSnapshot.yz,
};

const RENDER_MODE_TO_SNAPSHOT: { [K in RenderMode]: RenderModeSnapshot } = {
  [RenderMode.volumetric]: RenderModeSnapshot.volumetric,
  [RenderMode.maxProject]: RenderModeSnapshot.maxProject,
  [RenderMode.pathTrace]: RenderModeSnapshot.pathTrace,
};

const IMAGE_TYPE_TO_SNAPSHOT: { [K in ImageType]: ImageTypeSnapshot } = {
  [ImageType.segmentedCell]: ImageTypeSnapshot.segmentedCell,
  [ImageType.fullField]: ImageTypeSnapshot.fullField,
};

/**
 * Converts a `ViewerState` to a `ViewerStateSnapshot`, suitable for serialization.
 */
export function viewerStateToSnapshot(state: Partial<ViewerState>, removeDefaults: boolean): ViewerStateSnapshot {
  let s = state;
  if (removeDefaults) {
    s = removeMatchingProperties(state, getDefaultViewerState());
    // special case: if there's an explicit scale level but it's not being used, no reason to include it
    if (s.scaleLevelIndex !== undefined && state.useExactScaleLevel === undefined) {
      delete s.scaleLevelIndex;
    }
  }

  const result: ViewerStateSnapshot = {
    [ViewerStateKeys.View]: s.viewMode && VIEW_MODE_TO_SNAPSHOT[s.viewMode],
    [ViewerStateKeys.Mode]: s.renderMode && RENDER_MODE_TO_SNAPSHOT[s.renderMode],
    [ViewerStateKeys.Mask]: s.maskAlpha,
    [ViewerStateKeys.Image]: s.imageType && IMAGE_TYPE_TO_SNAPSHOT[s.imageType],
    [ViewerStateKeys.Axes]: s.showAxes,
    [ViewerStateKeys.BoundingBox]: s.showBoundingBox,
    [ViewerStateKeys.BoundingBoxColor]: s.boundingBoxColor && colorArrayToHex(s.boundingBoxColor),
    [ViewerStateKeys.BackgroundColor]: s.backgroundColor && colorArrayToHex(s.backgroundColor),
    [ViewerStateKeys.Autorotate]: s.autorotate,
    [ViewerStateKeys.Brightness]: s.brightness,
    [ViewerStateKeys.Density]: s.density,
    [ViewerStateKeys.Interpolation]: s.interpolationEnabled,
    [ViewerStateKeys.Region]: s.region && xyzToArray(s.region),
    [ViewerStateKeys.Slice]: s.slice && xyzToArray(s.slice),
    [ViewerStateKeys.Levels]: s.levels && [...s.levels],
    [ViewerStateKeys.Time]: s.time,
    [ViewerStateKeys.Scene]: s.scene,
    [ViewerStateKeys.SingleChannelMode]: s.singleChannelMode,
    [ViewerStateKeys.SingleChannelIndex]: s.singleChannelIndex,
    [ViewerStateKeys.UseExactScaleLevel]: s.useExactScaleLevel,
    [ViewerStateKeys.ScaleLevelIndex]: s.scaleLevelIndex,
    [ViewerStateKeys.CameraState]: cameraStateToSnapshot(s.cameraState, removeDefaults, s.viewMode),
  };

  return removeUndefinedProperties(result);
}

export function channelStateToSnapshot(state: Partial<ChannelState>, removeDefaults: boolean): ChannelStateSnapshot {
  const s = removeDefaults ? removeMatchingProperties(state, getDefaultChannelState()) : state;

  const result: ChannelStateSnapshot = {
    [ChannelStateKeys.VolumeEnabled]: s.volumeEnabled,
    [ChannelStateKeys.SurfaceEnabled]: s.isosurfaceEnabled,
    [ChannelStateKeys.IsosurfaceValue]: s.isovalue,
    [ChannelStateKeys.IsosurfaceAlpha]: s.opacity,
    [ChannelStateKeys.Colorize]: s.colorizeEnabled,
    [ChannelStateKeys.ColorizeAlpha]: s.colorizeAlpha,
    [ChannelStateKeys.Color]: s.color && colorArrayToHex(s.color),
    [ChannelStateKeys.ControlPoints]: s.controlPoints && s.controlPoints.map(controlPointToSnapshot),
    [ChannelStateKeys.ControlPointsEnabled]: s.useControlPoints,
    [ChannelStateKeys.Ramp]: s.ramp && [...s.ramp],
    [ChannelStateKeys.KeepRange]: s.keepIntensityRange,
  };

  return removeUndefinedProperties(result);
}

/**
 * Helper function for converting all keys of an object to `string` representations.
 *
 * Accepts an object of the input type, and a map of stringifiers for each of the input type's properties.
 */
const stringify = <T extends Record<string, unknown>>(
  record: Partial<T>,
  stringifiers: { [K in keyof T]: (value: T[K]) => string }
): Partial<Record<keyof T, string>> => {
  const result: Partial<Record<keyof T, string>> = {};

  for (const k of Object.keys(record)) {
    const key = k as keyof T;
    const value = record[key];
    const stringifier = stringifiers[key];

    if (value !== undefined && stringifier !== undefined) {
      result[key] = stringifier(value);
    }
  }

  return result;
};

/**
 * Formats a float or integer value to a string with a maximum precision for float values.
 * @param value The number to format.
 * @param maxPrecision The maximum number of significant digits to display for float values.
 * Default is 7.
 * @returns
 * - For integers, the integer value as a string.
 * - For floats, the float value as a string with a maximum of `maxPrecision` significant digits
 * and any trailing zeroes removed.
 *
 * @example
 * ```
 * formatFloat(1.23456, 3) // "1.23"
 * formatFloat(123456, 3) // "123456"
 * formatFloat(1.3999999999999999, 3) // "1.4"
 * ```
 */
function formatFloat(value: number, maxPrecision: number = 7): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return Number(value.toPrecision(maxPrecision)).toString();
}

const stringifyBoolean = (value: boolean): "1" | "0" => (value ? "1" : "0");

const stringifyNumberList = (list: number[], separator = ":"): string =>
  list.map((value) => formatFloat(value)).join(separator);

function stringifyControlPointSnapshots(controlPoints: ControlPointSnapshot[]): string {
  return controlPoints.map((cp) => `${formatFloat(cp.x)}:${formatFloat(cp.opacity)}:${cp.color}`).join(":");
}

/**
 * Converts all keys of a `CameraStateSnapshot` to compact `string` representations,
 * for serialization to `string` formats.
 */
export const stringifyCameraStateSnapshot = (snapshot: CameraStateSnapshot): CameraStateStringified =>
  stringify(snapshot, {
    [CameraTransformKeys.Position]: stringifyNumberList,
    [CameraTransformKeys.Target]: stringifyNumberList,
    [CameraTransformKeys.Up]: stringifyNumberList,
    [CameraTransformKeys.OrthoScale]: formatFloat,
    [CameraTransformKeys.Fov]: formatFloat,
  });

/**
 * Converts all keys of a `ViewerStateSnapshot` to compact `string` representations,
 * for serialization to `string` formats.
 */
export const stringifyViewerStateSnapshot = (snapshot: ViewerStateSnapshot): ViewerStateStringified =>
  stringify(snapshot, {
    [ViewerStateKeys.View]: identity,
    [ViewerStateKeys.Mode]: identity,
    [ViewerStateKeys.Mask]: formatFloat,
    [ViewerStateKeys.Image]: identity,
    [ViewerStateKeys.Axes]: stringifyBoolean,
    [ViewerStateKeys.BoundingBox]: stringifyBoolean,
    [ViewerStateKeys.BoundingBoxColor]: identity,
    [ViewerStateKeys.BackgroundColor]: identity,
    [ViewerStateKeys.Autorotate]: stringifyBoolean,
    [ViewerStateKeys.Brightness]: formatFloat,
    [ViewerStateKeys.Density]: formatFloat,
    [ViewerStateKeys.Interpolation]: stringifyBoolean,
    [ViewerStateKeys.Region]: (value) => value.map((axis) => stringifyNumberList(axis)).join(","),
    [ViewerStateKeys.Slice]: (value) => stringifyNumberList(value, ","),
    [ViewerStateKeys.Levels]: (value) => stringifyNumberList(value, ","),
    [ViewerStateKeys.Time]: formatFloat,
    [ViewerStateKeys.Scene]: formatFloat,
    [ViewerStateKeys.SingleChannelMode]: stringifyBoolean,
    [ViewerStateKeys.SingleChannelIndex]: formatFloat,
    [ViewerStateKeys.UseExactScaleLevel]: stringifyBoolean,
    [ViewerStateKeys.ScaleLevelIndex]: formatFloat,
    [ViewerStateKeys.CameraState]: (value) => objectToKeyValueList(stringifyCameraStateSnapshot(value)),
  });

/**
 * Converts all keys of a `ChannelStateSnapshot` to compact `string` representations,
 * for serialization to `string` formats.
 */
export const stringifyChannelStateSnapshot = (snapshot: ChannelStateSnapshot): ChannelStateStringified =>
  stringify(snapshot, {
    [ChannelStateKeys.Color]: identity,
    [ChannelStateKeys.Colorize]: stringifyBoolean,
    [ChannelStateKeys.ColorizeAlpha]: formatFloat,
    [ChannelStateKeys.IsosurfaceAlpha]: formatFloat,
    [ChannelStateKeys.Lut]: ([min, max]) => `${min}:${max}`,
    [ChannelStateKeys.ControlPoints]: stringifyControlPointSnapshots,
    [ChannelStateKeys.ControlPointsLegacy]: stringifyControlPointSnapshots,
    [ChannelStateKeys.Ramp]: stringifyNumberList,
    [ChannelStateKeys.RampLegacy]: stringifyNumberList,
    [ChannelStateKeys.ControlPointsEnabled]: stringifyBoolean,
    [ChannelStateKeys.VolumeEnabled]: stringifyBoolean,
    [ChannelStateKeys.SurfaceEnabled]: stringifyBoolean,
    [ChannelStateKeys.IsosurfaceValue]: formatFloat,
    [ChannelStateKeys.KeepRange]: stringifyBoolean,
  });

/**
 * Converts a single viewer channel setting into a `ChannelStateStringified`.
 *
 * This is equivalent to (and implemented by) applying `channelStateToSnapshot`, then `stringifyChannelStateSnapshot`.
 * @param channelSetting The channel state object to serialize.
 * @param removeDefaults Whether to remove properties that match the output of `getDefaultChannelState`.
 * @returns A `ChannelStateStringified` object with the serialized parameters. `undefined` values are removed.
 */
export const channelStateToStringSnapshot = (
  channelSetting: Partial<ChannelState>,
  removeDefaults: boolean
): ChannelStateStringified => stringifyChannelStateSnapshot(channelStateToSnapshot(channelSetting, removeDefaults));

/**
 * Serializes a `ViewerState` object into a `ViewerStateStringified`.
 *
 * This is equivalent to (and implemented by) applying `viewerStateToSnapshot`, then `stringifyViewerStateSnapshot`.
 * @param state The `ViewerState` to serialize.
 * @param removeDefaults If true, remove properties that match the output of `getDefaultViewerState`.
 * @returns A `ViewerStateStringified` object with the serialized parameters. `undefined` values are removed.
 */
export const viewerStateToStringSnapshot = (
  state: Partial<ViewerState>,
  removeDefaults: boolean
): ViewerStateStringified => stringifyViewerStateSnapshot(viewerStateToSnapshot(state, removeDefaults));
