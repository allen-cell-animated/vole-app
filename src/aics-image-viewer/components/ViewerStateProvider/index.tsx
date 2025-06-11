import { isEqual } from "lodash";
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import { getDefaultViewerChannelSettings, getDefaultViewerState } from "../../shared/constants";
import { RenderMode, ViewMode } from "../../shared/enums";
import { ColorArray } from "../../shared/utils/colorRepresentations";
import { useConstructor } from "../../shared/utils/hooks";
import type {
  ChannelSettingUpdater,
  ChannelState,
  ChannelStateKey,
  PartialIfObject,
  ViewerSettingChangeHandlers,
  ViewerSettingUpdater,
  ViewerState,
  ViewerStateContextType,
} from "./types";

import ResetStateProvider from "./ResetStateProvider";

const isObject = <T,>(val: T): val is Extract<T, Record<string, unknown>> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

// Some viewer settings require custom change behaviors to change related settings simultaneously or guard against
// entering an illegal state (e.g. autorotate must not be on in pathtrace mode). Those behaviors are defined here.
const VIEWER_SETTINGS_CHANGE_HANDLERS: ViewerSettingChangeHandlers = {
  // View mode: if we're switching to 2d, switch to volumetric rendering
  viewMode: (prevSettings, viewMode) => {
    const switchToVolumetric = viewMode !== ViewMode.threeD && prevSettings.renderMode === RenderMode.pathTrace;
    return {
      ...prevSettings,
      viewMode,
      renderMode: switchToVolumetric ? RenderMode.volumetric : prevSettings.renderMode,
    };
  },
  // Render mode: if we're switching to pathtrace, turn off autorotate
  // Also, do not allow pathtrace mode in any mode other than 3D.
  renderMode: (prevSettings, renderMode) => {
    if (renderMode === RenderMode.pathTrace && prevSettings.viewMode !== ViewMode.threeD) {
      return { ...prevSettings };
    }
    return {
      ...prevSettings,
      renderMode,
      autorotate: renderMode === RenderMode.pathTrace ? false : prevSettings.autorotate,
    };
  },
  // Autorotate: do not enable autorotate while in pathtrace mode
  autorotate: (prevSettings, autorotate) => ({
    ...prevSettings,
    // The button should theoretically be unclickable while in pathtrace mode, but this provides extra security
    autorotate: prevSettings.renderMode === RenderMode.pathTrace ? false : autorotate,
  }),
};

type ViewerStateAction<K extends keyof ViewerState> = {
  key: K;
  value: PartialIfObject<ViewerState[K]>;
};

const viewerSettingsReducer = <K extends keyof ViewerState>(
  viewerSettings: ViewerState,
  { key, value }: ViewerStateAction<K>
): ViewerState => {
  const changeHandler = VIEWER_SETTINGS_CHANGE_HANDLERS[key];

  if (changeHandler) {
    // This setting has a custom change handler. Let it handle creating a new state object.
    return changeHandler(viewerSettings, value);
  } else {
    const setting = viewerSettings[key];
    if (isObject(setting) && isObject(value)) {
      // This setting is an object, and we may be updating it with a partial object.
      return { ...viewerSettings, [key]: { ...setting, ...value } };
    } else {
      // This setting is regular. Update it the regular way.
      return { ...viewerSettings, [key]: value };
    }
  }
};

enum ChannelSettingActionType {
  UniformUpdate = "UniformUpdate",
  ArrayUpdate = "ArrayUpdate",
  Init = "Init",
}

/** Set channel setting `key` on one or more channels specified by `index` to value `value`. */
type ChannelSettingUniformUpdateAction<K extends ChannelStateKey> = {
  type: ChannelSettingActionType.UniformUpdate;
  index: number | number[];
  value: Partial<Record<K, ChannelState[K]>>;
};
/** Set the values of channel setting `key` for all channels from an array of values ordered by channel index */
type ChannelSettingArrayUpdateAction<K extends ChannelStateKey> = {
  type: ChannelSettingActionType.ArrayUpdate;
  key: K;
  value: ChannelState[K][];
};
/** Initialize list of channel states */
type ChannelSettingInitAction = {
  type: ChannelSettingActionType.Init;
  value: ChannelState[];
};

type ChannelStateAction<K extends ChannelStateKey> =
  | ChannelSettingUniformUpdateAction<K>
  | ChannelSettingArrayUpdateAction<K>
  | ChannelSettingInitAction;

const channelSettingsReducer = <K extends ChannelStateKey>(
  channelSettings: ChannelState[],
  action: ChannelStateAction<K>
): ChannelState[] => {
  if (action.type === ChannelSettingActionType.Init) {
    // ChannelSettingInitAction
    return action.value;
  } else if (action.type === ChannelSettingActionType.ArrayUpdate) {
    // ChannelSettingArrayUpdateAction
    return channelSettings.map((channel, idx) => {
      return action.value[idx] ? { ...channel, [action.key]: action.value[idx] } : channel;
    });
  } else {
    // type is ChannelSettingActionType.UniformUpdate
    if (Array.isArray(action.index)) {
      // ChannelSettingUniformUpdateAction on potentially multiple channels
      return channelSettings.map((channel, idx) =>
        (action.index as number[]).includes(idx) ? { ...channel, ...action.value } : channel
      );
    } else {
      // ChannelSettingUniformUpdateAction on a single channel
      const newSettings = channelSettings.slice();
      if (action.index >= 0 && action.index < channelSettings.length) {
        newSettings[action.index] = { ...newSettings[action.index], ...action.value };
      }
      return newSettings;
    }
  }
};

const nullfn = (): void => {};

const DEFAULT_VIEWER_CONTEXT: ViewerStateContextType = {
  ...getDefaultViewerState(),
  channelSettings: [],
  changeViewerSetting: nullfn,
  setChannelSettings: nullfn,
  changeChannelSetting: nullfn,
  applyColorPresets: nullfn,
  resetToSavedViewerState: nullfn,
  resetToDefaultViewerState: nullfn,
  setSavedViewerChannelSettings: nullfn,
  getCurrentViewerChannelSettings: () => getDefaultViewerChannelSettings(),
  getChannelsAwaitingReset: () => new Set(),
  getChannelsAwaitingResetOnLoad: () => new Set(),
  onResetChannel: nullfn,
};

export const ALL_VIEWER_STATE_KEYS = Object.keys(DEFAULT_VIEWER_CONTEXT) as (keyof ViewerStateContextType)[];

const DEFAULT_VIEWER_CONTEXT_OUTER = { ref: { current: DEFAULT_VIEWER_CONTEXT } };

type NoNull<T> = { [K in keyof T]: NonNullable<T[K]> };
type ContextRefType = NoNull<React.MutableRefObject<ViewerStateContextType>>;

export const ViewerStateContext = React.createContext<{ ref: ContextRefType }>(DEFAULT_VIEWER_CONTEXT_OUTER);

/** Provides a central store for the state of the viewer, and the methods to update it. */
const ViewerStateProvider: React.FC<{ viewerSettings?: Partial<ViewerState>; children?: React.ReactNode }> = (
  props
) => {
  const [viewerSettings, viewerDispatch] = useReducer(viewerSettingsReducer, { ...getDefaultViewerState() });
  const [channelSettings, channelDispatch] = useReducer(channelSettingsReducer, []);
  // Provide viewer state via a ref, so that closures that run asynchronously can capture the ref instead of the
  // specific values they need and always have the most up-to-date state.
  const ref = useRef(DEFAULT_VIEWER_CONTEXT);

  const resetProvider = useConstructor(() => new ResetStateProvider(ref));
  useEffect(() => {
    resetProvider.setSavedViewerState(props.viewerSettings || {});
  }, [props.viewerSettings, resetProvider]);

  const changeViewerSetting = useCallback<ViewerSettingUpdater>((key, value) => viewerDispatch({ key, value }), []);

  const changeChannelSetting = useCallback<ChannelSettingUpdater>((index, value) => {
    channelDispatch({ type: ChannelSettingActionType.UniformUpdate, index, value });
  }, []);

  const applyColorPresets = useCallback(
    (value: ColorArray[]): void => channelDispatch({ type: ChannelSettingActionType.ArrayUpdate, key: "color", value }),
    []
  );

  const setChannelSettings = useCallback(
    (channels: ChannelState[]) => channelDispatch({ type: ChannelSettingActionType.Init, value: channels }),
    []
  );

  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const prevViewerSettingsPropsRef = useRef<Partial<ViewerState> | undefined>(undefined);
  if (props.viewerSettings && !isEqual(props.viewerSettings, prevViewerSettingsPropsRef.current)) {
    for (const key of Object.keys(props.viewerSettings) as (keyof ViewerState)[]) {
      if (viewerSettings[key] !== props.viewerSettings[key]) {
        changeViewerSetting(key, props.viewerSettings[key] as any);
      }
    }
    prevViewerSettingsPropsRef.current = props.viewerSettings;
  }

  const context = useMemo(() => {
    ref.current = {
      ...viewerSettings,
      channelSettings,
      changeViewerSetting,
      setChannelSettings,
      changeChannelSetting,
      applyColorPresets,
      // Reset-related callbacks
      setSavedViewerChannelSettings: resetProvider.setSavedViewerChannelSettings,
      getCurrentViewerChannelSettings: resetProvider.getCurrentViewerChannelSettings,
      getChannelsAwaitingReset: resetProvider.getChannelsAwaitingReset,
      getChannelsAwaitingResetOnLoad: resetProvider.getChannelsAwaitingResetOnLoad,
      onResetChannel: resetProvider.onResetChannel,
      resetToSavedViewerState: resetProvider.resetToSavedViewerState,
      resetToDefaultViewerState: resetProvider.resetToDefaultViewerState,
    };

    // `ref` is wrapped in another object to ensure that the context updates when state does.
    // (`ref` on its own would always compare equal to itself and the context would never update.)
    return { ref };
  }, [
    viewerSettings,
    channelSettings,
    applyColorPresets,
    changeViewerSetting,
    changeChannelSetting,
    setChannelSettings,
    resetProvider,
  ]);

  return <ViewerStateContext.Provider value={context}>{props.children}</ViewerStateContext.Provider>;
};

/**
 * Higher-order component that connects a component to the viewer state context.
 *
 * Accepts a `component` and an array of `keys` from the viewer state context, and returns a new memoized component
 * which "subscribes" to only those fields of state, and will not re-render if other fields change. This works by
 * creating a component which is "split in two" as described
 * [here](https://react.dev/reference/react/memo#updating-a-memoized-component-using-a-context).
 *
 * NOTE that while higher-order components don't seem to be explicitly considered an anti-pattern, they don't appear in
 * modern documentation because they are "[not commonly used in modern React
 * code](https://legacy.reactjs.org/docs/higher-order-components.html)." React-redux, which inspired this "connect"
 * pattern, has also generally moved away from this pattern [in favor of a hooks-based
 * approach](https://react-redux.js.org/api/hooks). I too would love to use hooks to connect to viewer state, but there
 * is currently no way to hook into context without agreeing to re-render on every change. I feel okay using a higher-
 * order component in this case because, analogous to a custom hook, it extends a provided primitive HOC (`memo`).
 */
export function connectToViewerState<
  Keys extends keyof ViewerStateContextType,
  Props extends Pick<ViewerStateContextType, Keys>,
>(component: React.FC<Props>, keys: Keys[]): React.FC<Omit<Props, Keys>> {
  const MemoedComponent = React.memo(component);

  const ConnectedComponent: React.FC<Omit<Props, Keys>> = (props) => {
    const viewerState = useContext(ViewerStateContext);

    const mergedProps = { ...props } as Props;
    for (const key of keys) {
      (mergedProps as Pick<ViewerStateContextType, Keys>)[key] = viewerState.ref.current[key];
    }

    return <MemoedComponent {...mergedProps} />;
  };

  ConnectedComponent.displayName = `Connected(${component.displayName || component.name})`;
  return ConnectedComponent;
}

export default ViewerStateProvider;
