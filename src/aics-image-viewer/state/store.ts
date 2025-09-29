import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { ChannelState, ViewerState } from "../components/ViewerStateProvider/types";
import { getDefaultViewerState } from "../shared/constants";
import { RenderMode, ViewMode } from "../shared/enums";
import { ColorArray } from "../shared/utils/colorRepresentations";

// TODO move back to a new `types` module (?)
type ViewerSettingChangeHandlers = {
  [K in keyof ViewerState]?: (value: Partial<ViewerState[K]>, settings: ViewerState) => Partial<ViewerState>;
};

const isRecord = <T>(val: T): val is Extract<T, Record<string, unknown>> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

const VIEWER_SETTINGS_CHANGE_HANDLERS: ViewerSettingChangeHandlers = {
  // Do not allow path trace render mode in 2D view modes
  viewMode: (viewMode, { renderMode }) => {
    const switchToVolumetric = viewMode !== ViewMode.threeD && renderMode === RenderMode.pathTrace;
    return {
      viewMode,
      renderMode: switchToVolumetric ? RenderMode.volumetric : renderMode,
    };
  },

  // Don't switch to path trace rendering in any view mode other than 3d; if we do switch, turn off autorotate
  renderMode: (renderMode, { viewMode, autorotate }) => {
    const willPathtrace = renderMode === RenderMode.pathTrace;
    if (willPathtrace && viewMode === ViewMode.threeD) {
      return {};
    }

    return {
      renderMode,
      autorotate: autorotate && !willPathtrace,
    };
  },

  // Do not allow autorotate while in pathtrace mode (button should be disabled, but this provides extra security)
  autorotate: (autorotate, { renderMode }) => ({
    autorotate: autorotate && renderMode !== RenderMode.pathTrace,
  }),
};

const validateStateValue = <K extends keyof ViewerState>(
  currentState: ViewerState,
  key: K,
  value: Partial<ViewerState[K]>
): Partial<ViewerState> => {
  const changeHandler = VIEWER_SETTINGS_CHANGE_HANDLERS[key];

  if (changeHandler) {
    // some settings have custom change handlers to avoid creating illegal states; if this one has one, call it
    return changeHandler(value, currentState);
  } else {
    // if not, merge the new value to the current one (if applicable) and return
    const currentValue = currentState[key];
    const nextValue = isRecord(currentValue) && isRecord(value) ? { ...currentValue, ...value } : value;
    return { [key]: nextValue };
  }
};

type ViewerStateActions = {
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
  ViewerStateActions & {
    channelSettings: ChannelState[];
  };

const createViewerStateStore: StateCreator<ViewerStore> = (set) => ({
  ...getDefaultViewerState(),
  channelSettings: [],

  changeViewerSetting: (key, value) => {
    set((state) => validateStateValue(state, key, value));
  },

  mergeViewerSettings: (settings): void => {
    set((state) => {
      const validated = {};

      for (const key of Object.keys(settings) as (keyof ViewerState)[]) {
        Object.assign(validated, validateStateValue(state, key, settings[key]));
      }

      return validated;
    });
  },

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
