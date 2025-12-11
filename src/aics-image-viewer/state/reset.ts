import type { StateCreator } from "zustand";

import {
  getDefaultCameraState,
  getDefaultChannelColor,
  getDefaultChannelState,
  getDefaultViewerState,
} from "../shared/constants";
import { ViewMode } from "../shared/enums";
import type { ViewerChannelSettings } from "../shared/utils/viewerChannelSettings";
import { getEnabledChannelIndices, initializeOneChannelSetting } from "../shared/utils/viewerState";
import type { ChannelState, ViewerState } from "../state/types";
import type { ViewerStore } from "./store";
import { validateState } from "./util";

export type ResetStateActions = {
  /**
   * Removes the channel from the list of channels to be reset (as given by
   * `getChannelsAwaitingReset()` or `getChannelsAwaitingResetOnLoad()`).
   */
  onResetChannel: (channelIndex: number) => void;

  /**
   * Resets the viewer and all channels to a saved initial state, determined
   * by viewer props.
   */
  resetToSavedViewerState: (savedState?: Partial<ViewerState>, viewerChannelSettings?: ViewerChannelSettings) => void;

  /**
   * Resets the viewer and all channels to the default state, as though
   * loaded from scratch with no initial parameters set.
   * Uses the default channel settings as given by `getDefaultViewerChannelSettings()`.
   */
  resetToDefaultViewerState: () => void;
};

export type ResetState = {
  useDefaultViewerChannelSettings: boolean;
  channelsToReset: number[];
  channelsToResetOnLoad: number[];
};

export type ResetStateSlice = ResetStateActions & ResetState;

const resetState = (
  currentState: ViewerState & { channelSettings: ChannelState[] },
  newState: ViewerState,
  newChannelStates: ChannelState[]
): ViewerState & Partial<ResetState> & { channelSettings: ChannelState[] } => {
  const { channelSettings, viewMode, time, slice, scene } = currentState;

  // Needs reset on reload if one of the view modes is 2D while the other is 3D,
  // if the timestamp is different, or if we're on a different z slice.
  // TODO: Handle stopping playback? Requires playback to be part of ViewerStateContext
  const isInDifferentViewMode =
    viewMode !== newState.viewMode && (viewMode === ViewMode.xy || newState.viewMode === ViewMode.xy);
  const isAtDifferentTime = time !== newState.time;
  const isAtDifferentZSlice = newState.viewMode === ViewMode.xy && !(newState.slice.z === slice.z);
  const isAtDifferentScene = newState.scene !== scene;
  const willNeedResetOnLoad = isInDifferentViewMode || isAtDifferentTime || isAtDifferentZSlice || isAtDifferentScene;

  const viewerState = validateState(currentState, newState);
  // Match the names in the new state with the existing state so we do not override the names.
  // Also don't reset the control points or ramps, since these will be reset in the app.
  const channelState = newChannelStates.map((state, index) => ({
    ...state,
    name: channelSettings[index].name,
    displayName: channelSettings[index].displayName,
    controlPoints: channelSettings[index].controlPoints,
    ramp: channelSettings[index].ramp,
    plotMin: channelSettings[index].plotMin,
    plotMax: channelSettings[index].plotMax,
  }));

  let channelsToReset = [...Array(newChannelStates.length).keys()];
  let channelsToResetOnLoad: number[] = [];
  if (willNeedResetOnLoad) {
    channelsToResetOnLoad = getEnabledChannelIndices(newChannelStates);
    channelsToReset = channelsToReset.filter((ch) => !channelsToResetOnLoad.includes(ch));
  }

  return {
    ...(viewerState as ViewerState),
    channelSettings: channelState,
    channelsToReset,
    channelsToResetOnLoad,
  };
};

export const createResetSlice: StateCreator<ViewerStore, [], [], ResetStateSlice> = (set) => ({
  channelsToReset: [],
  channelsToResetOnLoad: [],
  savedViewerChannelSettings: undefined,
  useDefaultViewerChannelSettings: false,

  onResetChannel: (channelIndex) => {
    set(({ channelsToReset, channelsToResetOnLoad }) => ({
      channelsToReset: channelsToReset.filter((ch) => ch !== channelIndex),
      channelsToResetOnLoad: channelsToResetOnLoad.filter((ch) => ch !== channelIndex),
    }));
  },

  resetToSavedViewerState: (savedState?: Partial<ViewerState>, viewerChannelSettings?: ViewerChannelSettings) => {
    set((currentState) => {
      const { channelSettings } = currentState;
      const newViewerState = {
        ...getDefaultViewerState(),
        cameraState: getDefaultCameraState(savedState?.viewMode ?? ViewMode.threeD),
        ...savedState,
      };

      const newChannelSettings = channelSettings.map((_, index) => {
        return initializeOneChannelSetting(
          channelSettings[index].name,
          index,
          getDefaultChannelColor(index),
          viewerChannelSettings
        );
      });

      return {
        ...resetState(currentState, newViewerState, newChannelSettings),
        useDefaultViewerChannelSettings: false,
      };
    });
  },

  resetToDefaultViewerState: () => {
    set((currentState) => {
      const { channelSettings } = currentState;
      const defaultViewerState = {
        ...getDefaultViewerState(),
        cameraState: getDefaultCameraState(ViewMode.threeD),
      };
      const defaultChannelStates = channelSettings.map((_, index) => {
        const defaultState = getDefaultChannelState(index);
        defaultState.volumeEnabled = index < 3;
        return defaultState;
      });

      return {
        ...resetState(currentState, defaultViewerState, defaultChannelStates),
        useDefaultViewerChannelSettings: true,
      };
    });
  },
});
