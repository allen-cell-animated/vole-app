import type { CameraState, ControlPoint } from "@aics/vole-core";
import { isEqual } from "lodash";

import { getDefaultCameraState, getDefaultChannelState, getDefaultViewerState } from "../shared/constants";
import { ViewMode } from "../shared/enums";
import type { PerAxis } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";
import { removeMatchingProperties, removeUndefinedProperties } from "../shared/utils/datatypes";
import type { ChannelState, ViewerChannelStateParams, ViewerState, ViewerStateParams } from "./types";
import { CameraTransformKeys, ViewerChannelSettingKeys, ViewerStateKeys } from "./types";

const DEFAULT_CONTROL_POINT_COLOR: [number, number, number] = [255, 255, 255];
const DEFAULT_CONTROL_POINT_COLOR_CODE = "1";

export function objectToKeyValueList(obj: Record<string, string | undefined>): string {
  const keyValuePairs: string[] = [];
  for (const key in obj) {
    const value = obj[key];
    if (value === undefined) {
      continue;
    }
    // Allow colon separators to remain unencoded to save URL character length.
    const escapedValue = encodeURIComponent(value.trim()).replace("%3A", ":");
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

function perAxisToArray<T>(perAxis: PerAxis<T>): T[] {
  return [perAxis.x, perAxis.y, perAxis.z];
}

/** Serializes a region into a `x1:x2,y1:y2,z1:z2` string format. */
function serializeRegion(region: PerAxis<[number, number]>): string {
  return perAxisToArray(region)
    .map((axis) => axis.map((val) => formatFloat(val)).join(":"))
    .join(",");
}

/** Serializes a slice parameter into a `x,y,z` string format. */
function serializeSlice(slice: PerAxis<number>): string {
  return perAxisToArray(slice)
    .map((val) => formatFloat(val))
    .join(",");
}

function serializeBoolean(value: boolean | undefined): "1" | "0" | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? "1" : "0";
}

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

function serializeControlPoints(controlPoints: ControlPoint[]): string {
  return controlPoints
    .map((cp) => {
      const x = formatFloat(cp.x);
      const opacity = formatFloat(cp.opacity);
      // Default color is empty string
      // TODO: Substitute
      const color = isEqual(cp.color, DEFAULT_CONTROL_POINT_COLOR)
        ? DEFAULT_CONTROL_POINT_COLOR_CODE
        : colorArrayToHex(cp.color);
      return `${x}:${opacity}:${color}`;
    })
    .join(":");
}

/**
 * Serializes a single viewer channel setting into a dictionary of URL parameters
 * (`ViewerChannelSettingParams`).
 * @param channelSetting The channel state object to serialize.
 * @param removeDefaults Whether to remove properties that match the output of `GET_DEFAULT_CHANNEL_STATE`.
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
      channelSetting.controlPoints && serializeControlPoints(channelSetting.controlPoints),
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
  const result: ViewerStateParams = {
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

  const viewModeToViewParam = {
    [ViewMode.threeD]: "3D",
    [ViewMode.xy]: "Z",
    [ViewMode.xz]: "Y",
    [ViewMode.yz]: "X",
  };
  result[ViewerStateKeys.View] = state.viewMode && viewModeToViewParam[state.viewMode];
  return removeUndefinedProperties(result);
}
