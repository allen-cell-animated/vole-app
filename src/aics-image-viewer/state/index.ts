import { create } from "zustand";

import { RenderMode, ViewMode } from "../shared/enums";

import { ViewerState } from "../components/ViewerStateProvider/types.js";
import { getDefaultViewerState } from "../shared/constants.js";

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

type ViewerStateActions = {
  changeViewerSetting: <K extends keyof ViewerState>(key: K, value: ViewerState[K]) => void;
};

type ViewerStore = ViewerState & ViewerStateActions;

export const useViewerState = create<ViewerStore>((set) => ({
  ...getDefaultViewerState(),
  changeViewerSetting: (key, value) => {
    set((state) => {
      let changeHandler = VIEWER_SETTINGS_CHANGE_HANDLERS[key];

      if (changeHandler) {
        return changeHandler(value, state);
      } else {
        let currentValue = state[key];
        let nextValue = isRecord(currentValue) && isRecord(value) ? { ...currentValue, ...value } : value;
        return { [key]: nextValue };
      }
    });
  },
}));
