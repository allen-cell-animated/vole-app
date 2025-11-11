import { LoadSpec, type RawArrayLoaderOptions, type View3d, type Volume, VolumeLoaderContext } from "@aics/vole-core";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Box3, Vector3 } from "three";

import {
  AXIS_TO_LOADER_PRIORITY,
  CACHE_MAX_SIZE,
  getDefaultChannelColor,
  QUEUE_MAX_LOW_PRIORITY_SIZE,
  QUEUE_MAX_SIZE,
} from "../shared/constants";
import { ViewMode } from "../shared/enums";
import type { AxisName } from "../shared/types";
import { useConstructor, useRefWithSetter } from "../shared/utils/hooks";
import PlayControls from "../shared/utils/playControls";
import SceneStore from "../shared/utils/sceneStore";
import { type ChannelGrouping, getDisplayName, makeChannelIndexGrouping } from "../shared/utils/viewerChannelSettings";
import { initializeOneChannelSetting } from "../shared/utils/viewerState";
import type { ChannelState } from "./ViewerStateProvider/types";

import { ViewerStateContext } from "./ViewerStateProvider";

export type UseVolumeOptions = {
  /** Callback for when the volume is created. */
  onCreateImage?: (image: Volume) => void;
  /** Callback for when a single channel of the volume has loaded. */
  onChannelLoaded?: (image: Volume, channelIndex: number, isInitialLoad: boolean) => void;
  /** Callback for when image loading encounters an error. */
  onError?: (error: unknown) => void;
  /** The name of a channel which should be treated as a mask rather than as viewable data. */
  maskChannelName?: string;
};

export const enum ImageLoadStatus {
  REQUESTED,
  LOADING,
  LOADED,
  ERROR,
}

// Used by `channelVersions` (see below)
const CHANNEL_INITIAL_LOAD = -1;
const CHANNEL_RELOAD = 0;

export type ReactiveVolume = {
  image: Volume | null;
  /**
   * Indicates the load status of each channel:
   *
   * - `-1` indicates the channel has not yet loaded and will get some extra initialization (e.g. LUTs) when it loads.
   * - `0` indicates the channel has been loaded once, but is currently waiting for new data.
   * - `1` or greater indicates the channel is loaded. Note this is not exactly `1` to handle multiple simultaneous
   *   loads; if multiple loads are issued before the first one completes, _incrementing_ rather than _setting_ the
   *   version number means we react to each load when it completes, rather than just the first.
   */
  channelVersions: number[];
  imageLoadStatus: ImageLoadStatus;
  setTime: (view3d: View3d, time: number) => void;
  setScene: (scene: number) => void;
  playControls: PlayControls;
  playingAxis: AxisName | "t" | null;
  channelGroupedByType: ChannelGrouping;
};

/**
 * Temporary hack while `useEffectEvent` is still experimental.
 *
 * Some functions play the role of event handlers (called to notify that something has happened) _within_ an effect.
 * Without any intervention, the linter will insist the function needs to be in the effect's dependencies, even though
 * it would make no sense to re-run the effect when the handler changes. So we hide the function behind a stable ref.
 *
 * See https://react.dev/learn/separating-events-from-effects#declaring-an-effect-event
 */
const useEffectEventRef = <T extends undefined | ((...args: any[]) => void)>(
  callback: T
): React.MutableRefObject<T> => {
  const callbackRef = useRef<T>(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  return callbackRef;
};

/**
 * Hook to open a volume from one or more sources (URLs or raw data) and provide controls for (re)loading and playback.
 *
 * @param scenePaths An array of volume data sources, one per scene. These can be:
 * - a string URL to a single source, or
 * - an array of strings to load multiple sources as a single volume, or
 * - a `RawArrayLoaderOptions` object to load raw data directly.
 * @param options An optional object with callbacks and other info. See docs for `UseVolumeOptions`.
 * @returns An object with the current image, its load status, and controls for playback and loading.
 */
const useVolume = (
  scenePaths: (string | string[] | RawArrayLoaderOptions)[],
  options?: UseVolumeOptions
): ReactiveVolume => {
  const viewerStateRef = useContext(ViewerStateContext).ref;
  const onErrorRef = useEffectEventRef(options?.onError);
  const onChannelLoadedRef = useEffectEventRef(options?.onChannelLoaded);
  const onCreateImageRef = useEffectEventRef(options?.onCreateImage);
  const maskChannelName = options?.maskChannelName;

  // set up our big objects: the image, its loading infrastructure, and controls for playback
  const [image, setImage] = useState<Volume | null>(null);
  const loadContext = useConstructor(
    () => new VolumeLoaderContext(CACHE_MAX_SIZE, QUEUE_MAX_SIZE, QUEUE_MAX_LOW_PRIORITY_SIZE)
  );
  const sceneLoader = useMemo(() => new SceneStore(loadContext, scenePaths), [loadContext, scenePaths]);
  const playControls = useConstructor(() => new PlayControls());
  const [playingAxis, setPlayingAxis] = useState<AxisName | "t" | null>(null);
  useEffect(() => {
    playControls.onPlayingAxisChanged = (axis) => {
      const isPlaying = axis !== null;
      setPlayingAxis(axis);
      // prioritize prefetching along the playing axis
      sceneLoader.setPrefetchPriority(axis ? [AXIS_TO_LOADER_PRIORITY[axis]] : []);
      // sync multichannel loading so we don't show loaded channels one at a time
      sceneLoader.syncMultichannelLoading(isPlaying);
      if (image) {
        // If we're playing and entire axis is not in memory (T always, Z likely), downlevel to speed things up
        const { volumeSize, subregionSize } = image.imageInfo;
        const shouldDownlevel = isPlaying && (axis === "t" || volumeSize[axis] !== subregionSize[axis]);
        image.updateRequiredData({ scaleLevelBias: shouldDownlevel ? 1 : 0 });
      }
    };
  }, [sceneLoader, playControls, image]);

  // track which channels have been loaded
  const [channelVersions, _setChannelVersions] = useState<number[]>([]);
  const [channelVersionsRef, setChannelVersions] = useRefWithSetter(_setChannelVersions, channelVersions);

  const { channelSettings } = viewerStateRef.current;
  // Some extra items for tracking load status
  const [loadThrewError, setLoadThrewError] = useState(false);
  const inInitialLoadRef = useRef(true);

  // derive whether the image is loaded from whether any and/or all channels are loaded
  const imageLoadStatus = useMemo(() => {
    if (loadThrewError) {
      return ImageLoadStatus.ERROR;
    }

    const [allLoaded, noneLoaded] = channelVersions.reduce(
      ([allLoaded, noneLoaded], version, idx) => {
        const setting = channelSettings[idx];
        if (setting && (setting.volumeEnabled || setting.isosurfaceEnabled || maskChannelName === setting.name)) {
          const loaded = version > 0;
          return [allLoaded && loaded, noneLoaded && !loaded];
        }
        return [allLoaded, noneLoaded];
      },
      [true, true]
    );

    if (allLoaded && inInitialLoadRef.current) {
      inInitialLoadRef.current = false;
    }

    return noneLoaded ? ImageLoadStatus.REQUESTED : allLoaded ? ImageLoadStatus.LOADED : ImageLoadStatus.LOADING;
  }, [channelVersions, channelSettings, maskChannelName, loadThrewError]);

  const setIsLoading = useCallback(() => {
    setLoadThrewError(false);
    setChannelVersions(channelVersionsRef.current.map((version) => Math.min(version, CHANNEL_RELOAD)));
  }, [channelVersionsRef, setChannelVersions]);

  const onError = useCallback(
    (e: unknown): never => {
      setLoadThrewError(true);
      onErrorRef.current?.(e);
      throw e;
    },
    [onErrorRef]
  );

  // channel indexes, sorted by category
  const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});

  const onChannelDataLoaded = useCallback(
    (aimg: Volume, channelIndex: number): void => {
      // let the hook caller know that this channel has loaded
      const isInitialLoad = channelVersionsRef.current[channelIndex] === CHANNEL_INITIAL_LOAD;
      onChannelLoadedRef.current?.(aimg, channelIndex, isInitialLoad);

      // set this channel as loaded
      const newVersions = channelVersionsRef.current.slice();
      newVersions[channelIndex] = Math.max(newVersions[channelIndex], CHANNEL_RELOAD) + 1;
      setChannelVersions(newVersions);

      // if the whole image has loaded, let `playControls` know (if we're playing, it may want to go to the next frame)
      if (aimg.isLoaded()) {
        playControls.onImageLoaded();
      }
    },
    [channelVersionsRef, onChannelLoadedRef, playControls, setChannelVersions]
  );

  // effect to start the initial load of the image
  useEffect(() => {
    const { changeViewerSetting, channelSettings, getCurrentViewerChannelSettings, setChannelSettings } =
      viewerStateRef.current;
    setChannelVersions(new Array(channelVersionsRef.current.length).fill(CHANNEL_INITIAL_LOAD));
    setLoadThrewError(false);
    inInitialLoadRef.current = true;

    const setChannelStateForNewImage = (channelNames: string[]): ChannelState[] | undefined => {
      const viewerChannelSettings = getCurrentViewerChannelSettings();
      const grouping = makeChannelIndexGrouping(channelNames, viewerChannelSettings);
      setChannelGroupedByType(grouping);

      // compare each channel's new displayName to the old displayNames currently in state:
      // same number of channels, and each channel has same displayName
      const allNamesAreEqual = channelNames.every((name, idx) => {
        const displayName = getDisplayName(name, idx, viewerChannelSettings);
        return displayName === channelSettings[idx]?.displayName;
      });

      if (allNamesAreEqual) {
        const newChannelSettings = channelNames.map((channel, index) => {
          return { ...channelSettings[index], name: channel };
        });
        setChannelSettings(newChannelSettings);
        return newChannelSettings;
      }

      const newChannelSettings = channelNames.map((channel, index) => {
        const color = getDefaultChannelColor(index);
        return initializeOneChannelSetting(channel, index, color, viewerChannelSettings);
      });
      setChannelSettings(newChannelSettings);
      return newChannelSettings;
    };

    const openImage = async (): Promise<void> => {
      const { scene, time } = viewerStateRef.current;

      const loadSpec = new LoadSpec();
      loadSpec.time = time;

      const aimg = await sceneLoader.createVolume(scene, loadSpec, onChannelDataLoaded).catch(onError);

      const channelNames = aimg.imageInfo.channelNames;
      const newChannelSettings = setChannelStateForNewImage(channelNames);

      setChannelVersions(new Array(channelNames.length).fill(CHANNEL_INITIAL_LOAD));
      setImage(aimg);

      onCreateImageRef.current?.(aimg);

      playControls.stepAxis = (axis: AxisName | "t") => {
        const { time, slice } = viewerStateRef.current;
        if (axis === "t") {
          changeViewerSetting("time", (time + 1) % aimg.imageInfo.times);
        } else {
          const max = aimg.imageInfo.volumeSize[axis];
          const current = slice[axis] * max;
          changeViewerSetting("slice", { ...slice, [axis]: ((current + 1) % max) / max });
        }
      };
      playControls.getVolumeIsLoaded = aimg.isLoaded.bind(aimg);

      const requiredLoadSpec = new LoadSpec();
      requiredLoadSpec.time = time;

      // make the currently enabled channels "required":
      // find all enabled indices in newChannelSettings:
      const requiredChannelsToLoad = newChannelSettings
        ? newChannelSettings.map((channel, index) => (channel.volumeEnabled ? index : -1)).filter((index) => index >= 0)
        : [];

      // add mask channel to required channels, if specified
      const maskChannelName = getCurrentViewerChannelSettings()?.maskChannelName;
      if (maskChannelName) {
        const maskChannelIndex = channelNames.indexOf(maskChannelName);
        if (maskChannelIndex >= 0 && !requiredChannelsToLoad.includes(maskChannelIndex)) {
          requiredChannelsToLoad.push(maskChannelIndex);
        }
      }
      requiredLoadSpec.channels = requiredChannelsToLoad;

      // When in 2D Z-axis view mode, we restrict the subregion to only the current slice. This is
      // to match an optimization that volume viewer does by loading Z-slices at a higher resolution,
      // and ensures the very first volume that is loaded is the same as the one that
      // will be shown whenever we switch back to the same viewer settings (2D Z-axis view mode).
      // (We don't do this for ZX and YZ modes because we assume that the data won't be chunked along the
      // X or Y axes in ways that would improve loading resolution, and we load the full 3D volume instead.)
      if (viewerStateRef.current.viewMode === ViewMode.xy) {
        const slice = viewerStateRef.current.slice;
        requiredLoadSpec.subregion = new Box3(new Vector3(0, 0, slice.z), new Vector3(1, 1, slice.z));
      }

      // initiate loading only after setting up new channel settings,
      // in case the loader callback fires before the state is set
      sceneLoader.loadScene(scene, aimg, requiredLoadSpec).catch(onError);
    };

    openImage();
  }, [
    sceneLoader,
    onError,
    onCreateImageRef,
    onChannelLoadedRef,
    viewerStateRef,
    channelVersionsRef,
    setChannelVersions,
    playControls,
    setIsLoading,
    onChannelDataLoaded,
  ]);
  // of the above dependencies, we expect only `sceneLoader` to change.

  const setTime = useCallback(
    (view3d: View3d, time: number): void => {
      if (image && !inInitialLoadRef.current) {
        view3d.setTime(image, time, onChannelDataLoaded).catch(onError);
        setIsLoading();
      }
    },
    [image, onError, setIsLoading, inInitialLoadRef, onChannelDataLoaded]
  );

  const setScene = useCallback(
    (scene: number): void => {
      if (image && !inInitialLoadRef.current) {
        sceneLoader.loadScene(scene, image, undefined, onChannelDataLoaded).catch(onError);
        setIsLoading();
      }
    },
    [image, onError, sceneLoader, setIsLoading, inInitialLoadRef, onChannelDataLoaded]
  );

  return useMemo(
    () => ({
      image,
      channelVersions,
      imageLoadStatus,
      setTime,
      setScene,
      playControls,
      playingAxis,
      channelGroupedByType,
    }),
    [image, channelVersions, imageLoadStatus, setTime, setScene, playControls, playingAxis, channelGroupedByType]
  );
};

export default useVolume;
