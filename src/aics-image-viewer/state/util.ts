import { ViewerState } from "../components/ViewerStateProvider/types";
import { RenderMode, ViewMode } from "../shared/enums";

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
    if (willPathtrace && viewMode !== ViewMode.threeD) {
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

export const validateStateValue = <K extends keyof ViewerState>(
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

export const validateState = (
  currentState: ViewerState,
  newState: Partial<{ [K in keyof ViewerState]: Partial<ViewerState[K]> }>
): Partial<ViewerState> => {
  const validated = {};

  for (const key of Object.keys(newState) as (keyof ViewerState)[]) {
    Object.assign(validated, validateStateValue(currentState, key, newState[key]));
  }

  return validated;
};
