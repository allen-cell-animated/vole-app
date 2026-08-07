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
  ControlPointSnapshot,
  ExportedChannelState,
  ExportedViewerState,
  ViewerChannelStateParams,
  ViewerState,
  ViewerStateParams,
} from "./types";
import { CameraTransformKeys, ViewerChannelSettingKeys, ViewerStateKeys, ViewMode } from "./types";

const ENCODED_COLON_REGEX = /%3A/g;

const DEFAULT_CONTROL_POINT_COLOR: [number, number, number] = [255, 255, 255];
const DEFAULT_CONTROL_POINT_COLOR_CODE = "1";

export function objectToKeyValueList(obj: Record<string, string | undefined>, keySeparator: string = ","): string {
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
  return keyValuePairs.join(keySeparator);
}

function colorArrayToHex(color: ColorArray): string {
  return color
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();
}

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

const xyzToArray = <T>({ x, y, z }: XYZ<T>): [T, T, T] => [x, y, z];

/** Serializes a region into a `x1:x2,y1:y2,z1:z2` string format. */
function serializeRegion(region: XYZ<[number, number]>): string {
  return xyzToArray(region)
    .map((axis) => axis.map((val) => formatFloat(val)).join(":"))
    .join(",");
}

/** Serializes a slice parameter into a `x,y,z` string format. */
function serializeSlice(slice: XYZ<number>): string {
  return xyzToArray(slice)
    .map((val) => formatFloat(val))
    .join(",");
}

function serializeBoolean(value: boolean | undefined): "1" | "0" | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? "1" : "0";
}

const stringifyBoolean = (value: boolean): "1" | "0" => (value ? "1" : "0");

export function serializeCameraState(
  cameraState: Partial<CameraState>,
  removeDefaults: boolean,
  viewMode: ViewMode = ViewMode.threeD
): string | undefined {
  if (removeDefaults) {
    // Note that we use the `getDefaultCameraState()` to get the defaults here,
    // instead of `getDefaultViewerState().cameraState`. The latter is undefined, which signals
    // that the camera should not be modified for URLs that don't specify it.
    cameraState = removeMatchingProperties(cameraState, getDefaultCameraState(viewMode));
    if (Object.keys(cameraState).length === 0) {
      return undefined;
    }
  }
  const cameraString = objectToKeyValueList({
    [CameraTransformKeys.Position]:
      cameraState.position && cameraState.position.map((value) => formatFloat(value)).join(":"),
    [CameraTransformKeys.Target]: cameraState.target && cameraState.target.map((value) => formatFloat(value)).join(":"),
    [CameraTransformKeys.Up]: cameraState.up && cameraState.up.map((value) => formatFloat(value)).join(":"),
    [CameraTransformKeys.OrthoScale]:
      cameraState.orthoScale === undefined ? undefined : formatFloat(cameraState.orthoScale),
    [CameraTransformKeys.Fov]: cameraState.fov === undefined ? undefined : formatFloat(cameraState.fov),
  });
  return cameraString === "" ? undefined : cameraString;
}

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

function stringifyControlPoints(controlPoints: ControlPoint[]): string {
  return controlPoints
    .map((cp) => {
      const x = formatFloat(cp.x);
      const opacity = formatFloat(cp.opacity);
      // Default control-point color is encoded as DEFAULT_CONTROL_POINT_COLOR_CODE ("1").
      const color = isEqual(cp.color, DEFAULT_CONTROL_POINT_COLOR)
        ? DEFAULT_CONTROL_POINT_COLOR_CODE
        : colorArrayToHex(cp.color);
      return `${x}:${opacity}:${color}`;
    })
    .join(":");
}

function stringifyControlPointSnapshots(controlPoints: ControlPointSnapshot[]): string {
  return controlPoints.map((cp) => `${formatFloat(cp.x)}:${formatFloat(cp.opacity)}:${cp.color}`).join(":");
}

/**
 * Serializes a single viewer channel setting into a dictionary of URL parameters
 * (`ViewerChannelStateParams`).
 * @param channelSetting The channel state object to serialize.
 * @param removeDefaults Whether to remove properties that match the output of `getDefaultChannelState`.
 * @returns A `ViewerChannelSettingParams` object with the serialized parameters. Undefined values are removed.
 */
export function serializeViewerChannelSetting(
  channelSetting: Partial<ChannelState>,
  removeDefaults: boolean
): Partial<ViewerChannelStateParams> {
  if (removeDefaults) {
    channelSetting = removeMatchingProperties(channelSetting, getDefaultChannelState());
  }
  return removeUndefinedProperties({
    [ViewerChannelSettingKeys.VolumeEnabled]: serializeBoolean(channelSetting.volumeEnabled),
    [ViewerChannelSettingKeys.SurfaceEnabled]: serializeBoolean(channelSetting.isosurfaceEnabled),
    [ViewerChannelSettingKeys.IsosurfaceValue]: channelSetting.isovalue?.toString(),
    [ViewerChannelSettingKeys.IsosurfaceAlpha]: channelSetting.opacity?.toString(),
    [ViewerChannelSettingKeys.Colorize]: serializeBoolean(channelSetting.colorizeEnabled),
    [ViewerChannelSettingKeys.ColorizeAlpha]: channelSetting.colorizeAlpha?.toString(),
    [ViewerChannelSettingKeys.Color]: channelSetting.color && colorArrayToHex(channelSetting.color),
    [ViewerChannelSettingKeys.ControlPoints]:
      channelSetting.controlPoints && stringifyControlPoints(channelSetting.controlPoints),
    [ViewerChannelSettingKeys.ControlPointsEnabled]: serializeBoolean(channelSetting.useControlPoints),
    [ViewerChannelSettingKeys.Ramp]: channelSetting.ramp?.join(":"),
    [ViewerChannelSettingKeys.KeepRange]: serializeBoolean(channelSetting.keepIntensityRange),
    // Note that Lut is not saved here, as it is expected as user input and is redundant with
    // the control points and ramp.
  });
}

/**
 * Serializes a `ViewerState` object into a dictionary of URL parameters.
 * @param state The `ViewerState` to serialize.
 * @param removeDefaults If true, remove properties that match the output of `getDefaultViewerState`.
 * @returns A `ViewerStateParams` object with the serialized parameters. Undefined values are removed.
 */
export function serializeViewerState(state: Partial<ViewerState>, removeDefaults: boolean): ViewerStateParams {
  if (removeDefaults) {
    state = removeMatchingProperties(state, getDefaultViewerState());
    // special case: if there's an explicit scale level but it's not being used, no reason to include it
    if (state.scaleLevelIndex !== undefined && state.useExactScaleLevel === undefined) {
      delete state.scaleLevelIndex;
    }
  }

  const viewModeToViewParam = {
    [ViewMode.threeD]: "3D",
    [ViewMode.xy]: "Z",
    [ViewMode.xz]: "Y",
    [ViewMode.yz]: "X",
  };

  const result: ViewerStateParams = {
    [ViewerStateKeys.View]: state.viewMode && viewModeToViewParam[state.viewMode],
    [ViewerStateKeys.Mode]: state.renderMode,
    [ViewerStateKeys.Mask]: state.maskAlpha?.toString(),
    [ViewerStateKeys.Image]: state.imageType,
    [ViewerStateKeys.Axes]: serializeBoolean(state.showAxes),
    [ViewerStateKeys.BoundingBox]: serializeBoolean(state.showBoundingBox),
    [ViewerStateKeys.BoundingBoxColor]: state.boundingBoxColor && colorArrayToHex(state.boundingBoxColor),
    [ViewerStateKeys.BackgroundColor]: state.backgroundColor && colorArrayToHex(state.backgroundColor),
    [ViewerStateKeys.Autorotate]: serializeBoolean(state.autorotate),
    [ViewerStateKeys.Brightness]: state.brightness?.toString(),
    [ViewerStateKeys.Density]: state.density?.toString(),
    [ViewerStateKeys.Interpolation]: serializeBoolean(state.interpolationEnabled),
    [ViewerStateKeys.Region]: state.region && serializeRegion(state.region),
    [ViewerStateKeys.Slice]: state.slice && serializeSlice(state.slice),
    [ViewerStateKeys.Levels]: state.levels?.join(","),
    [ViewerStateKeys.Time]: state.time?.toString(),
    [ViewerStateKeys.Scene]: state.scene?.toString(),
    [ViewerStateKeys.SingleChannelMode]: serializeBoolean(state.singleChannelMode),
    [ViewerStateKeys.SingleChannelIndex]: state.singleChannelIndex?.toString(),
    [ViewerStateKeys.UseExactScaleLevel]: serializeBoolean(state.useExactScaleLevel),
    [ViewerStateKeys.ScaleLevelIndex]: state.scaleLevelIndex?.toString(),
    [ViewerStateKeys.CameraState]:
      state.cameraState && serializeCameraState(state.cameraState as CameraState, removeDefaults, state.viewMode),
  };
  return removeUndefinedProperties(result);
}

export function viewerStateToSnapshot(state: Partial<ViewerState>, removeDefaults: boolean): ExportedViewerState {
  let s = state;
  if (removeDefaults) {
    s = removeMatchingProperties(state, getDefaultViewerState());
    // special case: if there's an explicit scale level but it's not being used, no reason to include it
    if (s.scaleLevelIndex !== undefined && state.useExactScaleLevel === undefined) {
      delete s.scaleLevelIndex;
    }
  }

  const result: ExportedViewerState = {
    [ViewerStateKeys.View]: s.viewMode,
    [ViewerStateKeys.Mode]: s.renderMode,
    [ViewerStateKeys.Mask]: s.maskAlpha,
    [ViewerStateKeys.Image]: s.imageType,
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

export function channelStateToSnapshot(state: Partial<ChannelState>, removeDefaults: boolean): ExportedChannelState {
  const s = removeDefaults ? removeMatchingProperties(state, getDefaultChannelState()) : state;

  const result: ExportedChannelState = {
    [ViewerChannelSettingKeys.VolumeEnabled]: s.volumeEnabled,
    [ViewerChannelSettingKeys.SurfaceEnabled]: s.isosurfaceEnabled,
    [ViewerChannelSettingKeys.IsosurfaceValue]: s.isovalue,
    [ViewerChannelSettingKeys.IsosurfaceAlpha]: s.opacity,
    [ViewerChannelSettingKeys.Colorize]: s.colorizeEnabled,
    [ViewerChannelSettingKeys.ColorizeAlpha]: s.colorizeAlpha,
    [ViewerChannelSettingKeys.Color]: s.color && colorArrayToHex(s.color),
    [ViewerChannelSettingKeys.ControlPoints]: s.controlPoints && s.controlPoints.map(controlPointToSnapshot),
    [ViewerChannelSettingKeys.ControlPointsEnabled]: s.useControlPoints,
    [ViewerChannelSettingKeys.Ramp]: s.ramp && [...s.ramp],
    [ViewerChannelSettingKeys.KeepRange]: s.keepIntensityRange,
  };

  return removeUndefinedProperties(result);
}

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

const stringifyNumberList = (list: number[], separator = ":"): string =>
  list.map((value) => formatFloat(value)).join(separator);

const VIEW_MODE_TO_VIEW_PARAM = {
  [ViewMode.threeD]: "3D",
  [ViewMode.xy]: "Z",
  [ViewMode.xz]: "Y",
  [ViewMode.yz]: "X",
};

export const stringifyCameraStateSnapshot = (snapshot: CameraStateSnapshot): CameraStateStringified =>
  stringify(snapshot, {
    [CameraTransformKeys.Position]: stringifyNumberList,
    [CameraTransformKeys.Target]: stringifyNumberList,
    [CameraTransformKeys.Up]: stringifyNumberList,
    [CameraTransformKeys.OrthoScale]: formatFloat,
    [CameraTransformKeys.Fov]: formatFloat,
  });

export const stringifyViewerStateSnapshot = (snapshot: ExportedViewerState): ViewerStateParams =>
  stringify(snapshot, {
    [ViewerStateKeys.View]: (mode) => VIEW_MODE_TO_VIEW_PARAM[mode],
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

export const stringifyChannelStateSnapshot = (snapshot: ExportedChannelState): ViewerChannelStateParams =>
  stringify(snapshot, {
    [ViewerChannelSettingKeys.Color]: identity,
    [ViewerChannelSettingKeys.Colorize]: stringifyBoolean,
    [ViewerChannelSettingKeys.ColorizeAlpha]: formatFloat,
    [ViewerChannelSettingKeys.IsosurfaceAlpha]: formatFloat,
    [ViewerChannelSettingKeys.Lut]: ([min, max]) => `${min}:${max}`,
    [ViewerChannelSettingKeys.ControlPoints]: stringifyControlPointSnapshots,
    [ViewerChannelSettingKeys.ControlPointsLegacy]: stringifyControlPointSnapshots,
    [ViewerChannelSettingKeys.Ramp]: stringifyNumberList,
    [ViewerChannelSettingKeys.RampLegacy]: stringifyNumberList,
    [ViewerChannelSettingKeys.ControlPointsEnabled]: stringifyBoolean,
    [ViewerChannelSettingKeys.VolumeEnabled]: stringifyBoolean,
    [ViewerChannelSettingKeys.SurfaceEnabled]: stringifyBoolean,
    [ViewerChannelSettingKeys.IsosurfaceValue]: formatFloat,
    [ViewerChannelSettingKeys.KeepRange]: stringifyBoolean,
  });
