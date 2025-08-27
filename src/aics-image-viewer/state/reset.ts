import { isEqual } from "lodash";
import type { StateCreator } from "zustand";

import { ChannelState, ViewerState } from "../components/ViewerStateProvider/types";
import {
  getDefaultCameraState,
  getDefaultChannelColor,
  getDefaultChannelState,
  getDefaultViewerState,
} from "../shared/constants";
import { ViewMode } from "../shared/enums";
import { ViewerChannelSettings } from "../shared/utils/viewerChannelSettings";
import { getEnabledChannelIndices, initializeOneChannelSetting } from "../shared/utils/viewerState";
import { ViewerStore } from "./store";
import { validateState } from "./util";

// TODO move to types?
export type ResetStateActions = {
  /**
   * Sets the initial viewer channel settings that will be applied when calling
   * `resetToSavedViewerState()`. Initial settings should be set from the viewer props (when embedded)
   * or the URL parameters.
   */
  setSavedViewerChannelSettings: (settings: ViewerChannelSettings | undefined) => void;
  /**
   * Returns the current viewer channel settings that should be used when resetting
   * the channel transfer functions (control points and ramp).
   */
  //   getCurrentViewerChannelSettings: () => ViewerChannelSettings | undefined;
  /** Channels that should be immediately reset on next render. */
  //   getChannelsAwaitingReset: () => Set<number>;
  /** Channels that should be reset once new data is loaded. */
  //   getChannelsAwaitingResetOnLoad: () => Set<number>;
  /**
   * Removes the channel from the list of channels to be reset (as given by
   * `getChannelsAwaitingReset()` or `getChannelsAwaitingResetOnLoad()`).
   */
  onResetChannel: (channelIndex: number) => void;

  /**
   * Resets the viewer and all channels to a saved initial state, determined
   * by viewer props.
   * The initial settings for channels can be set with `setSavedViewerChannelSettings()`.
   */
  resetToSavedViewerState: () => void;
  /**
   * Resets the viewer and all channels to the default state, as though
   * loaded from scratch with no initial parameters set.
   * Uses the default channel settings as given by `getDefaultViewerChannelSettings()`.
   */
  resetToDefaultViewerState: () => void;
};

export type ResetState = {
  savedViewerState: Partial<ViewerState>;
  savedViewerChannelSettings: ViewerChannelSettings | undefined;
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
  const { channelSettings, viewMode, time, slice } = currentState;

  // Needs reset on reload if one of the view modes is 2D while the other is 3D,
  // if the timestamp is different, or if we're on a different z slice.
  // TODO: Handle stopping playback? Requires playback to be part of ViewerStateContext
  const isInDifferentViewMode =
    viewMode !== newState.viewMode && (viewMode === ViewMode.xy || newState.viewMode === ViewMode.xy);
  const isAtDifferentTime = time !== newState.time;
  const isAtDifferentZSlice = newState.viewMode === ViewMode.xy && !isEqual(newState.slice.z, slice.z);
  const willNeedResetOnLoad = isInDifferentViewMode || isAtDifferentTime || isAtDifferentZSlice;

  const viewerState = validateState(currentState, newState);
  // Match the names in the new state with the existing state so we do not override the names.
  // Also don't reset the control points or ramps, since these will be reset in the app.
  const channelState = newChannelStates.map((state, index) => ({
    ...state,
    name: channelSettings[index].name,
    controlPoints: channelSettings[index].controlPoints,
    ramp: channelSettings[index].ramp,
  }));

  let channelsToReset = [...Array(newChannelStates.length).keys()];
  let channelsToResetOnLoad: number[] = [];
  if (willNeedResetOnLoad) {
    channelsToResetOnLoad = getEnabledChannelIndices(newChannelStates);
    channelsToReset = channelsToResetOnLoad.filter((ch) => !channelsToResetOnLoad.includes(ch));
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
  savedViewerState: {},
  savedViewerChannelSettings: undefined,
  useDefaultViewerChannelSettings: false,

  setSavedViewerChannelSettings: (settings: ViewerChannelSettings | undefined): void => {
    set({ savedViewerChannelSettings: settings });
  },

  onResetChannel: (channelIndex: number): void => {
    set(({ channelsToReset, channelsToResetOnLoad }) => ({
      channelsToReset: channelsToReset.filter((ch) => ch !== channelIndex),
      channelsToResetOnLoad: channelsToResetOnLoad.filter((ch) => ch !== channelIndex),
    }));
  },

  resetToSavedViewerState: (): void => {
    set((currentState) => {
      const { channelSettings, savedViewerState, savedViewerChannelSettings } = currentState;
      const newViewerState = {
        ...getDefaultViewerState(),
        cameraState: getDefaultCameraState(savedViewerState.viewMode ?? ViewMode.threeD),
        ...savedViewerState,
      };
      const newChannelSettings = channelSettings.map((_, index) => {
        return initializeOneChannelSetting(
          channelSettings[index].name,
          index,
          getDefaultChannelColor(index),
          savedViewerChannelSettings
        );
      });

      return {
        ...resetState(currentState, newViewerState, newChannelSettings),
        useDefaultViewerChannelSettings: true,
      };
    });
  },

  resetToDefaultViewerState: (): void => {
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
