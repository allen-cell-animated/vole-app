import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { getDefaultViewerState } from "../shared/constants";
import type { ColorArray } from "../shared/utils/colorRepresentations";
import { createResetSlice, type ResetStateSlice } from "./reset";
import type { ChannelState, ViewerState } from "./types";
import { validateState, validateStateValue } from "./util";

export type ViewerStateActions = {
  changeViewerSetting: <K extends keyof ViewerState>(key: K, value: Partial<ViewerState[K]>) => void;
  mergeViewerSettings: (value: Partial<{ [K in keyof ViewerState]: Partial<ViewerState[K]> }>) => void;
  changeChannelSetting: <K extends keyof ChannelState>(
    index: number | number[],
    value: Partial<Record<K, ChannelState[K]>>
  ) => void;
  initChannelSettings: (channelSettings: ChannelState[]) => void;
  applyColorPresets: (colors: ColorArray[]) => void;
};

export type ViewerStore = ViewerState &
  ViewerStateActions &
  ResetStateSlice & {
    channelSettings: ChannelState[];
  };

const createViewerStateStore: StateCreator<ViewerStore> = (set, ...etc) => ({
  ...createResetSlice(set, ...etc),
  ...getDefaultViewerState(),
  channelSettings: [],

  changeViewerSetting: (key, value) => set((state) => validateStateValue(state, key, value)),

  mergeViewerSettings: (settings) => set((state) => validateState(state, settings)),

  changeChannelSetting: (index, value) => {
    set(({ channelSettings }) => ({
      channelSettings: channelSettings.map((channel, channelIndex) => {
        const changeThisChannel = Array.isArray(index) ? index.includes(channelIndex) : index === channelIndex;
        return changeThisChannel ? { ...channel, ...value } : channel;
      }),
    }));
  },

  initChannelSettings: (channelSettings) => set({ channelSettings }),

  applyColorPresets: (colors) => {
    set(({ channelSettings }) => ({
      channelSettings: channelSettings.map((channel, channelIndex) => ({
        ...channel,
        color: colors[channelIndex % colors.length],
      })),
    }));
  },
});

export const useViewerState = create<ViewerStore>()(subscribeWithSelector(createViewerStateStore));

export const selectViewerSettings = (store: ViewerStore): ViewerState => ({
  viewMode: store.viewMode,
  renderMode: store.renderMode,
  imageType: store.imageType,
  showAxes: store.showAxes,
  showBoundingBox: store.showBoundingBox,
  boundingBoxColor: store.boundingBoxColor,
  backgroundColor: store.backgroundColor,
  autorotate: store.autorotate,
  maskAlpha: store.maskAlpha,
  brightness: store.brightness,
  density: store.density,
  levels: store.levels,
  interpolationEnabled: store.interpolationEnabled,
  region: store.region,
  slice: store.slice,
  time: store.time,
  scene: store.scene,
  cameraState: store.cameraState,
});

/**
 * A small boilerplate-reducer for subscribing to a single state value with `useViewerStore`.
 * Should only be used with string literals for best type-checking results.
 */
export const select = <K extends string>(key: K) => {
  return <V>(settings: Record<K, V>) => settings[key];
};
