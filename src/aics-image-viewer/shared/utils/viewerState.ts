import type { ChannelState } from "../../state/types";
import { getDefaultChannelState } from "../constants";
import type { ColorArray } from "./colorRepresentations";
import type { ViewerChannelSetting, ViewerChannelSettings } from "./viewerChannelSettings";
import { findFirstChannelMatch, getDisplayName } from "./viewerChannelSettings";

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
    keepIntensityRange: initSettings.keepIntensityRange ?? defaultChannelState.keepIntensityRange,
    // Note: The below values are placeholders and will be overridden (and the
    // initial settings applied) when the channel is first loaded.
    controlPoints: initSettings.controlPoints ?? defaultChannelState.controlPoints,
    ramp: initSettings.ramp ?? defaultChannelState.ramp,
    plotMin: defaultChannelState.plotMin,
    plotMax: defaultChannelState.plotMax,
  };
}
