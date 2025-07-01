import { ChannelState, ViewerSettingUpdater, ViewerState } from "../../components/ViewerStateProvider/types";
import { getDefaultChannelState } from "../constants";
import { ColorArray } from "./colorRepresentations";
import {
  findFirstChannelMatch,
  getDisplayName,
  ViewerChannelSetting,
  ViewerChannelSettings,
} from "./viewerChannelSettings";

/** Sets all fields of the viewer state to the values of the `newState`. */
export function overrideViewerState(changeViewerSetting: ViewerSettingUpdater, newState: ViewerState): void {
  for (const key of Object.keys(newState) as (keyof ViewerState)[]) {
    changeViewerSetting(key, newState[key] as any);
  }

  // Pathtrace rendering is not allowed in 2D view mode but is in 3D mode.
  // Since we're not guaranteed on the order of object keys, apply changes to render mode a second time
  // in case we were previously in 2D view mode and the change was blocked, but we're now in 3D.
  changeViewerSetting("renderMode", newState.renderMode);
}

export function overrideChannelStates(
  setChannelSettings: (settings: ChannelState[]) => void,
  currentStates: ChannelState[],
  newStates: ChannelState[]
): void {
  // Match the names in the new state with the existing state so we do not override the names.
  // Also don't reset the control points or ramps, since these will be reset in the app.
  for (let i = 0; i < newStates.length; i++) {
    newStates[i].name = currentStates[i].name;
    newStates[i].controlPoints = currentStates[i].controlPoints;
    newStates[i].ramp = currentStates[i].ramp;
  }
  setChannelSettings(newStates);
}

/** Returns the indices of channels that have either the volume or isosurface enabled. */
export function getEnabledChannelIndices(channelSettings: ChannelState[]): number[] {
  const enabledChannels = [];
  for (let i = 0; i < channelSettings.length; i++) {
    if (channelSettings[i].volumeEnabled || channelSettings[i].isosurfaceEnabled) {
      enabledChannels.push(i);
    }
  }
  return enabledChannels;
}

export function colorHexToArray(hex: string): ColorArray | null {
  // hex is a xxxxxx string. split it into array of rgb ints
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
  } else {
    return null;
  }
}

export function initializeOneChannelSetting(
  channelName: string,
  index: number,
  defaultColor: ColorArray,
  viewerChannelSettings?: ViewerChannelSettings,
  defaultChannelState: ChannelState = getDefaultChannelState()
): ChannelState {
  let initSettings = {} as Partial<ViewerChannelSetting>;
  if (viewerChannelSettings) {
    // search for channel in settings using groups, names and match values
    initSettings = findFirstChannelMatch(channelName, index, viewerChannelSettings) ?? {};
  }

  return {
    name: channelName ?? "Channel " + index,
    displayName: getDisplayName(channelName ?? "Channel " + index, index, viewerChannelSettings),
    volumeEnabled: initSettings.enabled ?? defaultChannelState.volumeEnabled,
    isosurfaceEnabled: initSettings.surfaceEnabled ?? defaultChannelState.isosurfaceEnabled,
    colorizeEnabled: initSettings.colorizeEnabled ?? defaultChannelState.colorizeEnabled,
    colorizeAlpha: initSettings.colorizeAlpha ?? defaultChannelState.colorizeAlpha,
    isovalue: initSettings.isovalue ?? defaultChannelState.isovalue,
    opacity: initSettings.surfaceOpacity ?? defaultChannelState.opacity,
    color: colorHexToArray(initSettings.color ?? "") ?? defaultColor,
    useControlPoints: initSettings.controlPointsEnabled ?? defaultChannelState.useControlPoints,
    controlPoints: initSettings.controlPoints ?? defaultChannelState.controlPoints,
    ramp: initSettings.ramp ?? defaultChannelState.ramp,
    plotMin: defaultChannelState.plotMin,
    plotMax: defaultChannelState.plotMax,
  };
}
