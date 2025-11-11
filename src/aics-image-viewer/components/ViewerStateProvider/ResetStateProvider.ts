import { isEqual } from "lodash";

import {
  getDefaultCameraState,
  getDefaultChannelColor,
  getDefaultChannelState,
  getDefaultViewerChannelSettings,
  getDefaultViewerState,
} from "../../shared/constants";
import { ViewMode } from "../../shared/enums";
import type { ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";
import {
  getEnabledChannelIndices,
  initializeOneChannelSetting,
  overrideChannelStates,
  overrideViewerState,
} from "../../shared/utils/viewerState";
import type { ChannelState, ResetState, ViewerState, ViewerStateContextType } from "./types";

/**
 * Provides reset functionality for the viewer and channel states.
 */
export default class ResetStateProvider implements ResetState {
  savedViewerState: Partial<ViewerState>;
  savedViewerChannelSettings: ViewerChannelSettings | undefined;
  useDefaultViewerChannelSettings: boolean;

  channelsToReset: Set<number>;
  channelsToResetOnLoad: Set<number>;

  ref: React.MutableRefObject<ViewerStateContextType>;

  constructor(viewerStateRef: React.MutableRefObject<ViewerStateContextType>) {
    this.ref = viewerStateRef;

    this.savedViewerState = {};
    this.channelsToReset = new Set();
    this.channelsToResetOnLoad = new Set();
    this.savedViewerChannelSettings = undefined;
    this.useDefaultViewerChannelSettings = false;

    this.resetToSavedViewerState = this.resetToSavedViewerState.bind(this);
    this.resetToDefaultViewerState = this.resetToDefaultViewerState.bind(this);
    this.resetToState = this.resetToState.bind(this);
    this.setSavedViewerState = this.setSavedViewerState.bind(this);
    this.setSavedViewerChannelSettings = this.setSavedViewerChannelSettings.bind(this);
    this.getChannelsAwaitingReset = this.getChannelsAwaitingReset.bind(this);
    this.getChannelsAwaitingResetOnLoad = this.getChannelsAwaitingResetOnLoad.bind(this);
    this.onResetChannel = this.onResetChannel.bind(this);
    this.getCurrentViewerChannelSettings = this.getCurrentViewerChannelSettings.bind(this);
  }

  // Setup Callbacks ////////////////////////////////////////////////////////////////////

  public setSavedViewerState(state: Partial<ViewerState>): void {
    this.savedViewerState = state;
  }

  public setSavedViewerChannelSettings(settings: ViewerChannelSettings | undefined): void {
    this.savedViewerChannelSettings = settings;
  }

  public getChannelsAwaitingReset(): Set<number> {
    return this.channelsToReset;
  }

  public getChannelsAwaitingResetOnLoad(): Set<number> {
    return this.channelsToResetOnLoad;
  }

  public onResetChannel(channelIndex: number): void {
    this.channelsToReset.delete(channelIndex);
    this.channelsToResetOnLoad.delete(channelIndex);
  }

  /**
   * Returns the current viewer channel settings that the viewer should use when
   * resetting channels to an initial state.
   */
  public getCurrentViewerChannelSettings(): ViewerChannelSettings | undefined {
    if (this.useDefaultViewerChannelSettings) {
      return getDefaultViewerChannelSettings();
    }
    return this.savedViewerChannelSettings;
  }

  /**
   * Helper method. Resets the viewer and all channels to the provided state. If new data needs to
   * be loaded, handles setup so the reset will be applied to each channel as it loads in.
   */
  private resetToState(newState: ViewerState, newChannelStates: ChannelState[]): void {
    const { changeViewerSetting, setChannelSettings, channelSettings, viewMode, time, slice } = this.ref.current;

    // Needs reset on reload if one of the view modes is 2D while the other is 3D,
    // if the timestamp is different, or if we're on a different z slice.
    // TODO: Handle stopping playback? Requires playback to be part of ViewerStateContext
    const isInDifferentViewMode =
      viewMode !== newState.viewMode && (viewMode === ViewMode.xy || newState.viewMode === ViewMode.xy);
    const isAtDifferentTime = time !== newState.time;
    const isAtDifferentZSlice = newState.viewMode === ViewMode.xy && !isEqual(newState.slice.z, slice.z);
    const willNeedResetOnLoad = isInDifferentViewMode || isAtDifferentTime || isAtDifferentZSlice;

    overrideViewerState(changeViewerSetting, newState);
    overrideChannelStates(setChannelSettings, channelSettings, newChannelStates);

    this.channelsToReset = new Set(Array(newChannelStates.length).keys());
    if (willNeedResetOnLoad) {
      const enabledChannelsAndResetState = getEnabledChannelIndices(newChannelStates);
      this.channelsToResetOnLoad = new Set(enabledChannelsAndResetState);
      for (const channelIndex of enabledChannelsAndResetState) {
        this.channelsToReset.delete(channelIndex);
      }
    }
  }

  /** Resets to the initial saved state of the viewer, as shown to the user on load. */
  public resetToSavedViewerState(): void {
    const { channelSettings } = this.ref.current;
    const newViewerState = {
      ...getDefaultViewerState(),
      cameraState: getDefaultCameraState(this.savedViewerState.viewMode || ViewMode.threeD),
      ...this.savedViewerState,
    };
    const newChannelSettings = channelSettings.map((_, index) => {
      const initialChannelSetting = initializeOneChannelSetting(
        channelSettings[index].name,
        index,
        getDefaultChannelColor(index),
        this.savedViewerChannelSettings
      );
      return {
        ...initialChannelSetting,
        plotMin: channelSettings[index].plotMin,
        plotMax: channelSettings[index].plotMax,
      };
    });
    this.resetToState(newViewerState, newChannelSettings);
    this.useDefaultViewerChannelSettings = false;
  }

  /** Reset to global default viewer state, as if loading the volume with no parameters. */
  public resetToDefaultViewerState(): void {
    const { channelSettings } = this.ref.current;
    const defaultViewerState = { ...getDefaultViewerState(), cameraState: getDefaultCameraState(ViewMode.threeD) };
    const defaultChannelStates = channelSettings.map((_, index) => getDefaultChannelState(index));

    for (let i = 0; i < Math.min(3, defaultChannelStates.length); i++) {
      defaultChannelStates[i].volumeEnabled = true;
    }

    this.resetToState(defaultViewerState, defaultChannelStates);
    this.useDefaultViewerChannelSettings = true;
  }
}
