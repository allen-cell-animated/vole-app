import { LoadSpec, RawArrayLoaderOptions, View3d, Volume } from "@aics/vole-core";
import { useContext, useRef, useState } from "react";
import { Box3, Vector3 } from "three";

import { DTYPE_RANGE, getDefaultChannelColor } from "../shared/constants";
import { ViewMode } from "../shared/enums";
import { AxisName } from "../shared/types";
import {
  controlPointsToRamp,
  initializeLut,
  rampToControlPoints,
  remapControlPointsForChannel,
} from "../shared/utils/controlPointsToLut";
import { useConstructor, useRefWithSetter } from "../shared/utils/hooks";
import PlayControls from "../shared/utils/playControls";
import SceneStore from "../shared/utils/sceneStore";
import { ChannelGrouping, getDisplayName, makeChannelIndexGrouping } from "../shared/utils/viewerChannelSettings";
import { initializeOneChannelSetting } from "../shared/utils/viewerState";
import { ChannelState } from "./ViewerStateProvider/types";

import { ViewerStateContext } from "./ViewerStateProvider";

const useVolume = (view3d: View3d): void => {
  const viewerState = useContext(ViewerStateContext).ref.current;
  const {
    changeChannelSetting,
    changeViewerSetting,
    channelSettings,
    getChannelsAwaitingResetOnLoad,
    getCurrentViewerChannelSettings,
    onResetChannel,
    setChannelSettings,
  } = viewerState;

  const [image, setImage] = useState<Volume | null>(null);
  const loader = useRef<SceneStore>();
  const playControls = useConstructor(() => new PlayControls());

  /** `true` when a channel's data has been loaded for the current image. */
  const hasChannelLoadedRef = useRef<boolean[]>([]);
  // TODO the following two states could be combined into an enum?
  // `true` when image data has been requested, but no data has been received yet
  const [sendingQueryRequest, setSendingQueryRequest] = useState(false);
  // `true` when all channels of the current image are loaded
  const [imageLoaded, setImageLoaded] = useState(false);
  // tracks which channels have been loaded
  const [channelVersions, _setChannelVersions] = useState<number[]>([]);
  const [channelVersionsRef, setChannelVersions] = useRefWithSetter(_setChannelVersions, channelVersions);
  // we need to keep track of channel ranges for remapping
  const channelRangesRef = useRef<([number, number] | undefined)[]>([]);
  // channel indexes, sorted by category
  const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});

  const setAllChannelsUnloaded = (numberOfChannels: number): void => {
    setChannelVersions(new Array(numberOfChannels).fill(0));
  };

  const setOneChannelLoaded = (index: number): void => {
    const newVersions = channelVersionsRef.current.slice();
    newVersions[index]++;
    setChannelVersions(newVersions);
  };

  const getOneChannelSetting = (channelName: string, settings?: ChannelState[]): ChannelState | undefined => {
    return (settings || viewerState.channelSettings).find((channel) => channel.name === channelName);
  };

  /**
   * Updates a channel's ramp and control points after new data has been loaded.
   *
   * Also handles initializing the ramp/control points on initial load and resetting
   * them when the channel is reset.
   */
  const updateChannelTransferFunction = (
    aimg: Volume,
    thisChannelsSettings: ChannelState,
    channelIndex: number
  ): void => {
    const thisChannel = aimg.getChannel(channelIndex);

    // If this is the first load of this image, auto-generate initial LUTs
    if (
      !hasChannelLoadedRef.current[channelIndex] ||
      !thisChannelsSettings.controlPoints ||
      !thisChannelsSettings.ramp ||
      getChannelsAwaitingResetOnLoad().has(channelIndex)
    ) {
      const viewerChannelSettings = getCurrentViewerChannelSettings();
      const { ramp, controlPoints } = initializeLut(aimg, channelIndex, viewerChannelSettings);

      changeChannelSetting(channelIndex, {
        controlPoints: controlPoints,
        ramp: controlPointsToRamp(ramp),
        // set the default range of the transfer function editor to cover the full range of the data type
        plotMax: DTYPE_RANGE[thisChannel.dtype].max,
      });
      onResetChannel(channelIndex);
    } else {
      // try not to update lut from here if we are in play mode
      // if (playingAxis !== null) {
      // do nothing here?
      // tell gui that we have updated control pts?
      //changeChannelSetting(channelIndex, "controlPoints", aimg.getChannel(channelIndex).lut.controlPoints);
      // }
      const oldRange = channelRangesRef.current[channelIndex];
      if (thisChannelsSettings.useControlPoints) {
        // control points were just automatically remapped - update in state
        const rampControlPoints = rampToControlPoints(thisChannelsSettings.ramp);
        // now manually remap ramp using the channel's old range
        const remappedRampControlPoints = remapControlPointsForChannel(rampControlPoints, oldRange, thisChannel);
        changeChannelSetting(channelIndex, {
          ramp: controlPointsToRamp(remappedRampControlPoints),
          controlPoints: thisChannel.lut.controlPoints,
        });
      } else {
        // ramp was just automatically remapped - update in state
        const ramp = controlPointsToRamp(thisChannel.lut.controlPoints);
        // now manually remap control points using the channel's old range
        const { controlPoints } = thisChannelsSettings;
        const remappedControlPoints = remapControlPointsForChannel(controlPoints, oldRange, thisChannel);
        changeChannelSetting(channelIndex, { controlPoints: remappedControlPoints, ramp: ramp });
      }
    }
  };

  const onChannelDataLoaded = (aimg: Volume, thisChannelsSettings: ChannelState, channelIndex: number): void => {
    const thisChannel = aimg.getChannel(channelIndex);
    updateChannelTransferFunction(aimg, thisChannelsSettings, channelIndex);

    // save the channel's new range for remapping next time
    channelRangesRef.current[channelIndex] = [thisChannel.rawMin, thisChannel.rawMax];

    view3d.updateLuts(aimg);
    view3d.onVolumeData(aimg, [channelIndex]);

    view3d.setVolumeChannelEnabled(aimg, channelIndex, thisChannelsSettings.volumeEnabled);
    if (aimg.channelNames[channelIndex] === getCurrentViewerChannelSettings()?.maskChannelName) {
      view3d.setVolumeChannelAsMask(aimg, channelIndex);
    }
    hasChannelLoadedRef.current[channelIndex] = true;

    // when any channel data has arrived:
    setSendingQueryRequest(false);
    setOneChannelLoaded(channelIndex);
    if (aimg.isLoaded()) {
      view3d.updateActiveChannels(aimg);
      setImageLoaded(true);
      playControls.onImageLoaded();
    }
  };

  const setChannelStateForNewImage = (channelNames: string[]): ChannelState[] | undefined => {
    const grouping = makeChannelIndexGrouping(channelNames, getCurrentViewerChannelSettings());
    setChannelGroupedByType(grouping);

    // compare each channel's new displayName to the old displayNames currently in state:
    // same number of channels, and each channel has same displayName
    const allNamesAreEqual = channelNames.every((name, idx) => {
      const displayName = getDisplayName(name, idx, getCurrentViewerChannelSettings());
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
      return initializeOneChannelSetting(channel, index, color, getCurrentViewerChannelSettings());
    });
    setChannelSettings(newChannelSettings);
    return newChannelSettings;
  };

  const placeImageInViewer = (aimg: Volume, newChannelSettings?: ChannelState[]): void => {
    setImage(aimg);

    const channelSetting = newChannelSettings || channelSettings;
    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      // Immediately passing down channel parameters isn't strictly necessary, but keeps things looking consistent on load
      channels: aimg.channelNames.map((name) => {
        const ch = getOneChannelSetting(name, channelSetting);
        if (!ch) {
          return {};
        }
        return {
          enabled: ch.volumeEnabled,
          isosurfaceEnabled: ch.isosurfaceEnabled,
          isovalue: ch.isovalue,
          isosurfaceOpacity: ch.opacity,
          color: ch.color,
        };
      }),
    });

    const mode3d = viewerState.viewMode === ViewMode.threeD;
    setIndicatorPositions(view3d, clippingPanelOpenRef.current, aimg.imageInfo.times > 1, numScenes > 1, mode3d);
    // TODO remove
    // imageLoadHandlers.current.forEach((effect) => effect(aimg));

    playControls.stepAxis = (axis: AxisName | "t") => {
      if (axis === "t") {
        changeViewerSetting("time", (viewerState.time + 1) % aimg.imageInfo.times);
      } else {
        const max = aimg.imageInfo.volumeSize[axis];
        const current = viewerState.slice[axis] * max;
        changeViewerSetting("slice", { ...viewerState.slice, [axis]: ((current + 1) % max) / max });
      }
    };
    playControls.getVolumeIsLoaded = aimg.isLoaded.bind(aimg);

    view3d.updateActiveChannels(aimg);
    // make sure we pick up whether the image needs to be in single-slice mode
    view3d.setCameraMode(viewerState.viewMode);
  };

  const openImage = async (
    scenePaths: (string | string[] | RawArrayLoaderOptions)[],
    onError: (error: unknown) => void
  ): Promise<void> => {
    const { channelSettings, scene, time } = viewerState;
    setSendingQueryRequest(true);
    setImageLoaded(false);
    hasChannelLoadedRef.current = [];

    const loadSpec = new LoadSpec();
    loadSpec.time = time;

    let aimg: Volume;
    try {
      // TODO null-check view3d.loaderContext
      loader.current = new SceneStore(view3d.loaderContext!, scenePaths);

      aimg = await loader.current.createVolume(scene, loadSpec, (v, channelIndex) => {
        // NOTE: this callback runs *after* `onNewVolumeCreated` below, for every loaded channel
        // TODO is this search by name necessary or will the `channelIndex` passed to the callback always match state?
        const thisChannelSettings = channelSettings[channelIndex];
        onChannelDataLoaded(v, thisChannelSettings!, channelIndex);
      });
    } catch (e) {
      onError(e);
      throw e;
    }

    const channelNames = aimg.imageInfo.channelNames;
    const newChannelSettings = setChannelStateForNewImage(channelNames);

    // order is important:
    // we need to remove the old volume before triggering channels unloaded,
    // which may cause calls on View3d to the old volume.
    view3d.removeAllVolumes();
    setAllChannelsUnloaded(channelNames.length);
    placeImageInViewer(aimg, newChannelSettings);
    channelRangesRef.current = new Array(channelNames.length).fill(undefined);

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
    if (viewerState.viewMode === ViewMode.xy) {
      const slice = viewerState.slice;
      requiredLoadSpec.subregion = new Box3(new Vector3(0, 0, slice.z), new Vector3(1, 1, slice.z));
    }

    // initiate loading only after setting up new channel settings,
    // in case the loader callback fires before the state is set
    loader.current.loadScene(scene, aimg, requiredLoadSpec).catch((e) => {
      onError(e);
      throw e;
    });
  };
};

export default useVolume;
