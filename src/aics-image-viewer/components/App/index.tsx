// 3rd Party Imports
import {
  CreateLoaderOptions,
  LoadSpec,
  PrefetchDirection,
  RawArrayLoaderOptions,
  RENDERMODE_PATHTRACE,
  RENDERMODE_RAYMARCH,
  View3d,
  Volume,
  VolumeFileFormat,
  VolumeLoaderContext,
} from "@aics/vole-core";
import { Layout } from "antd";
import { debounce, isEqual } from "lodash";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Box3, Vector3 } from "three";

import {
  AXIS_MARGIN_DEFAULT,
  CACHE_MAX_SIZE,
  CLIPPING_PANEL_HEIGHT_DEFAULT,
  CLIPPING_PANEL_HEIGHT_TALL,
  CONTROL_PANEL_CLOSE_WIDTH,
  DTYPE_RANGE,
  getDefaultChannelColor,
  getDefaultViewerState,
  QUEUE_MAX_LOW_PRIORITY_SIZE,
  QUEUE_MAX_SIZE,
  SCALE_BAR_MARGIN_DEFAULT,
} from "../../shared/constants";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import { activeAxisMap, AxisName, IsosurfaceFormat, MetadataRecord, PerAxis } from "../../shared/types";
import { colorArrayToFloats } from "../../shared/utils/colorRepresentations";
import {
  controlPointsToRamp,
  initializeLut,
  rampToControlPoints,
  remapControlPointsForChannel,
} from "../../shared/utils/controlPointsToLut";
import { useConstructor, useStateWithGetter } from "../../shared/utils/hooks";
import PlayControls from "../../shared/utils/playControls";
import SceneStore from "../../shared/utils/sceneStore";
import {
  alphaSliderToImageValue,
  brightnessSliderToImageValue,
  densitySliderToImageValue,
  gammaSliderToImageValues,
} from "../../shared/utils/sliderValuesToImageValues";
import { ChannelGrouping, getDisplayName, makeChannelIndexGrouping } from "../../shared/utils/viewerChannelSettings";
import { initializeOneChannelSetting } from "../../shared/utils/viewerState";
import type { ChannelState } from "../ViewerStateProvider/types";
import type { AppProps, ControlVisibilityFlags, MultisceneUrls, UseImageEffectType } from "./types";

import CellViewerCanvasWrapper from "../CellViewerCanvasWrapper";
import ControlPanel from "../ControlPanel";
import { useErrorAlert } from "../ErrorAlert";
import StyleProvider from "../StyleProvider";
import Toolbar from "../Toolbar";
import { ViewerStateContext } from "../ViewerStateProvider";
import ChannelUpdater from "./ChannelUpdater";

import "../../assets/styles/globals.css";
import "./styles.css";

const { Sider, Content } = Layout;

const defaultVisibleControls: ControlVisibilityFlags = {
  alphaMaskSlider: true,
  autoRotateButton: true,
  axisClipSliders: true,
  brightnessSlider: true,
  backgroundColorPicker: true,
  boundingBoxColorPicker: true,
  colorPresetsDropdown: true,
  densitySlider: true,
  levelsSliders: true,
  interpolationControl: true,
  saveSurfaceButtons: true,
  fovCellSwitchControls: true,
  viewModeRadioButtons: true,
  resetCameraButton: true,
  showAxesButton: true,
  showBoundingBoxButton: true,
  metadataViewer: true,
};

const defaultProps: AppProps = {
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData: undefined,
  // rawDims is the volume dims that normally come from a json file
  rawDims: undefined,

  imageUrl: "",
  parentImageUrl: "",

  appHeight: "100vh",
  visibleControls: defaultVisibleControls,
  viewerSettings: getDefaultViewerState(),
  cellId: "",
  imageDownloadHref: "",
  parentImageDownloadHref: "",
  pixelSize: undefined,
  canvasMargin: "0 0 0 0",
  view3dRef: undefined,
};

const axisToLoaderPriority: Record<AxisName | "t", PrefetchDirection> = {
  t: PrefetchDirection.T_PLUS,
  z: PrefetchDirection.Z_PLUS,
  y: PrefetchDirection.Y_PLUS,
  x: PrefetchDirection.X_PLUS,
};

const CLIPPING_PANEL_ANIMATION_DURATION_MS = 300;

const setIndicatorPositions = (
  view3d: View3d,
  panelOpen: boolean,
  hasTime: boolean,
  hasScenes: boolean,
  isMode3d: boolean
): void => {
  // The height of the clipping panel includes the button, but we're trying to put these elements next to the button
  const CLIPPING_PANEL_BUTTON_HEIGHT = 40;
  // Move scale bars this far to the left when showing time series, to make room for timestep indicator
  const SCALE_BAR_TIME_SERIES_OFFSET = 120;

  let axisY = AXIS_MARGIN_DEFAULT[1];
  let [scaleBarX, scaleBarY] = SCALE_BAR_MARGIN_DEFAULT;
  if (panelOpen) {
    // If we have Time, Scene, X, Y, and Z sliders, the drawer will need to be a bit taller
    let isTall = hasTime && hasScenes && isMode3d;
    let clippingPanelFullHeight = isTall ? CLIPPING_PANEL_HEIGHT_TALL : CLIPPING_PANEL_HEIGHT_DEFAULT;
    let clippingPanelHeight = clippingPanelFullHeight - CLIPPING_PANEL_BUTTON_HEIGHT;
    // Move indicators up out of the way of the clipping panel
    axisY += clippingPanelHeight;
    scaleBarY += clippingPanelHeight;
  }
  if (hasTime) {
    // Move scale bar left out of the way of timestep indicator
    scaleBarX += SCALE_BAR_TIME_SERIES_OFFSET;
    // Make sure the timestep indicator is showing
    view3d.setShowTimestepIndicator(true);
  }

  view3d.setAxisPosition(AXIS_MARGIN_DEFAULT[0], axisY);
  view3d.setTimestepIndicatorPosition(SCALE_BAR_MARGIN_DEFAULT[0], scaleBarY);
  view3d.setScaleBarPosition(scaleBarX, scaleBarY);
};

// TODO this component, specifically its volume loading behavior, is way out of compliance with react-hooks lints
//   and will need a larger refactoring pass to fix that.
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
const App: React.FC<AppProps> = (props) => {
  props = { ...defaultProps, ...props };

  // State management /////////////////////////////////////////////////////////
  const viewerState = useContext(ViewerStateContext).ref;
  const {
    channelSettings,
    setChannelSettings,
    changeViewerSetting,
    changeChannelSetting,
    applyColorPresets,
    setSavedViewerChannelSettings,
    getCurrentViewerChannelSettings,
    // TODO: Show a loading spinner while any channels are awaiting reset.
    getChannelsAwaitingReset,
    getChannelsAwaitingResetOnLoad,
    onResetChannel,
  } = viewerState.current;

  useMemo(() => {
    if (props.viewerChannelSettings) {
      setSavedViewerChannelSettings(props.viewerChannelSettings);
    }
  }, [props.viewerChannelSettings]);

  const view3d = useConstructor(() => new View3d());
  if (props.view3dRef !== undefined) {
    props.view3dRef.current = view3d;
  }
  const loadContext = useConstructor(
    () => new VolumeLoaderContext(CACHE_MAX_SIZE, QUEUE_MAX_SIZE, QUEUE_MAX_LOW_PRIORITY_SIZE)
  );

  // install loadContext into view3d
  view3d.loaderContext = loadContext;

  const loader = useRef<SceneStore>();
  const [image, setImage] = useState<Volume | null>(null);
  const imageUrlRef = useRef<string | string[] | MultisceneUrls>("");

  const [errorAlert, _showError] = useErrorAlert();
  const showError = (error: unknown): void => {
    _showError(error);
    setSendingQueryRequest(false);
  };

  useEffect(() => {
    // Get notifications of loading errors which occur after the initial load, e.g. on time change or new channel load
    view3d.setLoadErrorHandler((_vol, e) => showError(e));
    return () => view3d.setLoadErrorHandler(undefined);
  }, [view3d]);

  const hasRawImage = !!(props.rawData && props.rawDims);
  const numScenes = hasRawImage ? 1 : ((props.imageUrl as MultisceneUrls).scenes?.length ?? 1);
  const numSlices: PerAxis<number> = image?.imageInfo.volumeSize ?? { x: 0, y: 0, z: 0 };
  const numSlicesLoaded: PerAxis<number> = image?.imageInfo.subregionSize ?? { x: 0, y: 0, z: 0 };
  const numTimesteps = image?.imageInfo.times ?? 1;

  // State for image loading/reloading

  /** `true` when a channel's data has been loaded for the current image. */
  const hasChannelLoadedRef = useRef<boolean[]>([]);
  // `true` when image data has been requested, but no data has been received yet
  const [sendingQueryRequest, setSendingQueryRequest] = useState(false);
  // `true` when all channels of the current image are loaded
  const [imageLoaded, setImageLoaded] = useState(false);
  // tracks which channels have been loaded
  const [channelVersions, setChannelVersions, getChannelVersions] = useStateWithGetter<number[]>([]);
  // we need to keep track of channel ranges for remapping
  const channelRangesRef = useRef<([number, number] | undefined)[]>([]);

  const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});
  const [controlPanelClosed, setControlPanelClosed] = useState(() => window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH);
  // Only allow auto-close once while the screen is too narrow.
  const [hasAutoClosedControlPanel, setHasAutoClosedControlPanel] = useState(false);

  const [clippingPanelOpen, setClippingPanelOpen] = useState(true);
  const clippingPanelOpenTimeout = useRef<number>(0);

  // `PlayControls` manages playing through time and spatial axes, which isn't practical with "pure" React
  // Playback state goes here, but the play/pause buttons that mainly control this class are down in `AxisClipSliders`
  const playControls = useConstructor(() => new PlayControls());
  const [playingAxis, setPlayingAxis] = useState<AxisName | "t" | null>(null);
  playControls.onPlayingAxisChanged = (axis) => {
    loader.current?.setPrefetchPriority(axis ? [axisToLoaderPriority[axis]] : []);
    loader.current?.syncMultichannelLoading(axis ? true : false);
    if (image) {
      if (axis === null) {
        // Playback has stopped - reset scale level bias
        view3d.setScaleLevelBias(image, 0);
      } else {
        // Playback has started - unless entire axis is in memory (typical in X and Y), downlevel to speed things up
        const shouldDownlevel = axis === "t" || numSlices[axis] !== numSlicesLoaded[axis];
        view3d.setScaleLevelBias(image, shouldDownlevel ? 1 : 0);
      }
    }
    setPlayingAxis(axis);
  };

  // These last state functions are only ever used within this component - no need for a `useCallback`

  const getOneChannelSetting = (channelName: string, settings?: ChannelState[]): ChannelState | undefined => {
    return (settings || viewerState.current.channelSettings).find((channel) => channel.name === channelName);
  };

  const setAllChannelsUnloaded = (numberOfChannels: number): void => {
    setChannelVersions(new Array(numberOfChannels).fill(0));
  };

  const setOneChannelLoaded = (index: number): void => {
    const newVersions = getChannelVersions().slice();
    newVersions[index]++;
    setChannelVersions(newVersions);
  };

  // Image loading/initialization functions ///////////////////////////////////

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
        plotMin: DTYPE_RANGE[thisChannel.dtype].min,
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

    const mode3d = viewerSettings.viewMode === ViewMode.threeD;
    setIndicatorPositions(view3d, clippingPanelOpen, aimg.imageInfo.times > 1, numScenes > 1, mode3d);
    imageLoadHandlers.current.forEach((effect) => effect(aimg));

    playControls.stepAxis = (axis: AxisName | "t") => {
      if (axis === "t") {
        changeViewerSetting("time", (viewerState.current.time + 1) % aimg.imageInfo.times);
      } else {
        const max = aimg.imageInfo.volumeSize[axis];
        const current = viewerState.current.slice[axis] * max;
        changeViewerSetting("slice", { ...viewerState.current.slice, [axis]: ((current + 1) % max) / max });
      }
    };
    playControls.getVolumeIsLoaded = () => aimg.isLoaded();

    view3d.updateActiveChannels(aimg);
    // make sure we pick up whether the image needs to be in single-slice mode
    view3d.setCameraMode(viewerSettings.viewMode);
  };

  const openImage = async (): Promise<void> => {
    const { imageUrl, parentImageUrl, rawData, rawDims } = props;
    const scene = viewerState.current.scene;
    let scenePaths: (string | string[])[] | [RawArrayLoaderOptions];

    if (rawData && rawDims) {
      scenePaths = [{ data: rawData, metadata: rawDims }];
    } else {
      const showParentImage = viewerState.current.imageType === ImageType.fullField && parentImageUrl !== undefined;
      const path = showParentImage ? parentImageUrl : imageUrl;
      // Don't reload if we're already looking at this image
      if (isEqual(path, imageUrlRef.current)) {
        return;
      }
      imageUrlRef.current = path;

      scenePaths = (path as MultisceneUrls).scenes ?? [path];
    }

    setSendingQueryRequest(true);
    setImageLoaded(false);
    hasChannelLoadedRef.current = [];

    const loadSpec = new LoadSpec();
    loadSpec.time = viewerState.current.time;

    const options: Partial<CreateLoaderOptions> = {};
    if (rawData && rawDims) {
      options.fileType = VolumeFileFormat.DATA;
      options.rawArrayOptions = { data: rawData, metadata: rawDims };
    }

    let aimg: Volume;
    try {
      loader.current = new SceneStore(loadContext, scenePaths);

      aimg = await loader.current.createVolume(scene, loadSpec, (v, channelIndex) => {
        // NOTE: this callback runs *after* `onNewVolumeCreated` below, for every loaded channel
        // TODO is this search by name necessary or will the `channelIndex` passed to the callback always match state?
        const thisChannelSettings = viewerState.current.channelSettings[channelIndex];
        onChannelDataLoaded(v, thisChannelSettings!, channelIndex);
      });
    } catch (e) {
      showError(e);
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
    requiredLoadSpec.time = viewerState.current.time;

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
    if (viewerSettings.viewMode === ViewMode.xy) {
      const slice = viewerSettings.slice;
      requiredLoadSpec.subregion = new Box3(new Vector3(0, 0, slice.z), new Vector3(1, 1, slice.z));
    }

    // initiate loading only after setting up new channel settings,
    // in case the loader callback fires before the state is set
    loader.current.loadScene(scene, aimg, requiredLoadSpec).catch((e) => {
      showError(e);
      throw e;
    });
  };

  // Imperative callbacks /////////////////////////////////////////////////////

  const viewerSettings = viewerState.current;

  const saveIsosurface = useCallback(
    (channelIndex: number, type: IsosurfaceFormat): void => {
      if (image) view3d.saveChannelIsosurface(image, channelIndex, type);
    },
    [image]
  );

  const saveScreenshot = useCallback((): void => {
    view3d.capture((dataUrl: string) => {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = "screenshot.png";
      anchor.click();
    });
  }, []);

  const onClippingPanelOpenChange = useCallback(
    (panelOpen: boolean): void => {
      if (panelOpen === clippingPanelOpen) {
        return;
      }

      const hasTime = numTimesteps > 1;
      const hasScenes = numScenes > 1;
      const mode3d = viewerSettings.viewMode === ViewMode.threeD;

      setClippingPanelOpen(panelOpen);
      setIndicatorPositions(view3d, panelOpen, hasTime, hasScenes, mode3d);

      // Hide indicators while clipping panel is in motion - otherwise they pop to the right place prematurely
      if (panelOpen) {
        view3d.setShowScaleBar(false);
        view3d.setShowTimestepIndicator(false);
        view3d.setShowAxis(false);

        window.clearTimeout(clippingPanelOpenTimeout.current);
        clippingPanelOpenTimeout.current = window.setTimeout(() => {
          view3d.setShowScaleBar(true);
          view3d.setShowTimestepIndicator(true);
          if (viewerSettings.showAxes) {
            view3d.setShowAxis(true);
          }
        }, CLIPPING_PANEL_ANIMATION_DURATION_MS);
      }
    },
    [view3d, numTimesteps, numScenes, viewerSettings.viewMode, viewerSettings.showAxes, clippingPanelOpen]
  );

  const getMetadata = useCallback((): MetadataRecord => {
    const { metadata, metadataFormatter } = props;

    let imageMetadata = image?.imageMetadata as MetadataRecord;
    if (imageMetadata && metadataFormatter) {
      imageMetadata = metadataFormatter(imageMetadata);
    }

    let sceneMeta: MetadataRecord | undefined;
    if (Array.isArray(metadata)) {
      // If metadata is an array, try to index it by scene
      if (metadata.length >= numScenes) {
        sceneMeta = metadata[viewerState.current.scene];
      } else {
        sceneMeta = metadata[0];
      }
    } else {
      sceneMeta = metadata;
    }

    if (imageMetadata && Object.keys(imageMetadata).length > 0) {
      return { Image: imageMetadata, ...sceneMeta };
    } else {
      return sceneMeta ?? {};
    }
  }, [props.metadata, props.metadataFormatter, image]);

  // Effects //////////////////////////////////////////////////////////////////

  // On mount
  useEffect(() => {
    const onResize = (): void => {
      if (window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH) {
        if (!hasAutoClosedControlPanel) {
          setControlPanelClosed(true);
          setHasAutoClosedControlPanel(true);
        }
      } else {
        setHasAutoClosedControlPanel(false);
      }
    };
    const onResizeDebounced = debounce(onResize, 500);

    window.addEventListener("resize", onResizeDebounced);
    return () => window.removeEventListener("resize", onResizeDebounced);
  }, [hasAutoClosedControlPanel]);

  // one-time init after view3d exists and before we start loading images
  useEffect(() => {
    view3d.setCameraMode(viewerSettings.viewMode);
  }, []);

  // Hook to trigger image load: on mount, when image source props/state change (`cellId`, `imageType`, `rawData`, etc)
  useEffect(() => {
    openImage();
  }, [props.imageUrl, props.cellId, viewerSettings.imageType, props.rawDims, props.rawData]);

  useEffect(
    () => props.onControlPanelToggle && props.onControlPanelToggle(controlPanelClosed),
    [controlPanelClosed, props.onControlPanelToggle]
  );

  useEffect(() => {
    // delayed for the animation to finish
    window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 200);
  }, [controlPanelClosed]);

  /** Custom effect hook for viewer updates that depend on `image`, so we don't have to repeatedly null-check it */
  const useImageEffect: UseImageEffectType = (effect, deps) => {
    useEffect(() => {
      if (image && imageLoaded) {
        return effect(image);
      }
    }, [...deps, image, imageLoaded]);
  };

  const imageLoadHandlers = useRef<((image: Volume) => void)[]>([]);
  imageLoadHandlers.current = [];
  /** `ImageEffect`s that also run right on image creation, so the image doesn't first render with default settings */
  const useImageLoadEffect: UseImageEffectType = (effect, deps) => {
    useImageEffect(effect, deps);
    imageLoadHandlers.current.push(effect);
  };

  // Effects to imperatively sync `viewerSettings` to `view3d`
  useImageEffect(
    (_currentImage) => {
      view3d.setCameraMode(viewerSettings.viewMode);
      view3d.resize(null);
    },
    [viewerSettings.viewMode]
  );

  useImageEffect(
    (_currentImage) => {
      if (viewerSettings.cameraState) {
        view3d.setCameraState(viewerSettings.cameraState);
      }
    },
    [viewerSettings.cameraState]
  );

  useImageEffect((_currentImage) => view3d.setAutoRotate(viewerSettings.autorotate), [viewerSettings.autorotate]);

  useImageEffect((_currentImage) => view3d.setShowAxis(viewerSettings.showAxes), [viewerSettings.showAxes]);

  useImageEffect(
    (_currentImage) => view3d.setBackgroundColor(colorArrayToFloats(viewerSettings.backgroundColor)),
    [viewerSettings.backgroundColor]
  );

  useImageEffect(
    (currentImage) => view3d.setBoundingBoxColor(currentImage, colorArrayToFloats(viewerSettings.boundingBoxColor)),
    [viewerSettings.boundingBoxColor]
  );

  useImageEffect(
    (currentImage) => view3d.setShowBoundingBox(currentImage, viewerSettings.showBoundingBox),
    [viewerSettings.showBoundingBox]
  );

  useImageEffect(
    (image) => {
      // Check whether any channels are marked to be reset and apply it.
      const channelsAwaitingReset = getChannelsAwaitingReset();
      for (let i = 0; i < channelSettings.length; i++) {
        if (channelsAwaitingReset.has(i)) {
          const { ramp, controlPoints } = initializeLut(image, i, getCurrentViewerChannelSettings());
          changeChannelSetting(i, { controlPoints: controlPoints, ramp: controlPointsToRamp(ramp) });
          onResetChannel(i);
        }
      }
    },
    [channelSettings]
  );

  useImageLoadEffect(
    (currentImage) => {
      const { renderMode } = viewerSettings;
      view3d.setMaxProjectMode(currentImage, renderMode === RenderMode.maxProject);
      view3d.setVolumeRenderMode(renderMode === RenderMode.pathTrace ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
      view3d.updateActiveChannels(currentImage);
    },
    [viewerSettings.renderMode]
  );

  useImageEffect(
    (currentImage) => {
      view3d.updateMaskAlpha(currentImage, alphaSliderToImageValue(viewerSettings.maskAlpha));
      view3d.updateActiveChannels(currentImage);
    },
    [viewerSettings.maskAlpha]
  );

  useImageLoadEffect(
    (_currentImage) => {
      const isPathTracing = viewerSettings.renderMode === RenderMode.pathTrace;
      const brightness = brightnessSliderToImageValue(viewerSettings.brightness, isPathTracing);
      view3d.updateExposure(brightness);
    },
    [viewerSettings.brightness]
  );

  useImageLoadEffect(
    (currentImage) => {
      const isPathTracing = viewerSettings.renderMode === RenderMode.pathTrace;
      const density = densitySliderToImageValue(viewerSettings.density, isPathTracing);
      view3d.updateDensity(currentImage, density);
    },
    [viewerSettings.density]
  );

  useImageLoadEffect(
    (currentImage) => {
      const imageValues = gammaSliderToImageValues(viewerSettings.levels);
      view3d.setGamma(currentImage, imageValues.min, imageValues.scale, imageValues.max);
    },
    [viewerSettings.levels]
  );

  // `time` is special: because syncing it requires a load, it cannot be dependent on `image`
  useEffect(() => {
    if (image) {
      setSendingQueryRequest(true);
      setAllChannelsUnloaded(image.numChannels);
      view3d.setTime(image, viewerSettings.time);
    }
  }, [viewerSettings.time]);

  useEffect(() => {
    if (image) {
      setSendingQueryRequest(true);
      loader.current?.loadScene(viewerSettings.scene, image).catch((e) => showError(e));
    }
  }, [viewerSettings.scene]);

  useImageLoadEffect(
    (currentImage) => view3d.setInterpolationEnabled(currentImage, viewerSettings.interpolationEnabled),
    [viewerSettings.interpolationEnabled]
  );

  useImageLoadEffect(
    (currentImage) => view3d.setVolumeTranslation(currentImage, props.transform?.translation || [0, 0, 0]),
    [props.transform?.translation]
  );

  useImageLoadEffect(
    (currentImage) => view3d.setVolumeRotation(currentImage, props.transform?.rotation || [0, 0, 0]),
    [props.transform?.rotation]
  );

  const usePerAxisClippingUpdater = (axis: AxisName, [minval, maxval]: [number, number], slice: number): void => {
    useImageEffect(
      // Logic to determine axis clipping range, for each of x,y,z,3d slider:
      // if slider was same as active axis view mode:  [viewerSettings.slice[axis], viewerSettings.slice[axis] + 1.0/volumeSize[axis]]
      // if in 3d mode: viewerSettings.region[axis]
      // else: [0,1]
      (currentImage) => {
        let isOrthoAxis = false;
        let axismin = 0.0;
        let axismax = 1.0;
        if (viewerSettings.viewMode === ViewMode.threeD) {
          axismin = minval;
          axismax = maxval;
          isOrthoAxis = false;
        } else {
          isOrthoAxis = activeAxisMap[viewerSettings.viewMode] === axis;
          const oneSlice = 1 / currentImage.imageInfo.volumeSize[axis];
          axismin = isOrthoAxis ? slice : 0.0;
          axismax = isOrthoAxis ? slice + oneSlice : 1.0;
          if (axis === "z" && viewerSettings.viewMode === ViewMode.xy) {
            view3d.setZSlice(currentImage, Math.floor(slice * currentImage.imageInfo.volumeSize.z));
            if (!currentImage.isLoaded()) {
              setImageLoaded(false);
            }
          }
        }
        // view3d wants the coordinates in the -0.5 to 0.5 range
        view3d.setAxisClip(currentImage, axis, axismin - 0.5, axismax - 0.5, isOrthoAxis);
        view3d.setCameraMode(viewerSettings.viewMode);
      },
      [minval, maxval, slice, viewerSettings.viewMode]
    );
  };

  usePerAxisClippingUpdater("x", viewerSettings.region.x, viewerSettings.slice.x);
  usePerAxisClippingUpdater("y", viewerSettings.region.y, viewerSettings.slice.y);
  usePerAxisClippingUpdater("z", viewerSettings.region.z, viewerSettings.slice.z);

  // Rendering ////////////////////////////////////////////////////////////////

  const visibleControls = useMemo(
    (): ControlVisibilityFlags => ({ ...defaultVisibleControls, ...props.visibleControls }),
    [props.visibleControls]
  );
  const pixelSize = useMemo(
    (): [number, number, number] => (image ? image.imageInfo.physicalPixelSize.toArray() : [1, 1, 1]),
    [image?.imageInfo.physicalPixelSize]
  );
  const resetCamera = useMemo(() => view3d.resetCamera.bind(view3d), [view3d]);

  return (
    <StyleProvider>
      {errorAlert}
      <Layout className="cell-viewer-app" style={{ height: props.appHeight }}>
        {channelSettings.map((channelState, index) => (
          <ChannelUpdater
            key={`${index}_${channelState.name}`}
            {...{ channelState, index }}
            view3d={view3d}
            image={image}
            version={channelVersions[index]}
          />
        ))}
        <Sider
          className="control-panel-holder"
          collapsible={true}
          defaultCollapsed={false}
          collapsedWidth={50}
          trigger={null}
          collapsed={controlPanelClosed}
          width={500}
        >
          <ControlPanel
            visibleControls={visibleControls}
            collapsed={controlPanelClosed}
            // image state
            imageName={image?.name}
            hasImage={!!image}
            pixelSize={pixelSize}
            channelDataChannels={image?.channels}
            channelGroupedByType={channelGroupedByType}
            // functions
            setCollapsed={setControlPanelClosed}
            saveIsosurface={saveIsosurface}
            onApplyColorPresets={applyColorPresets}
            viewerChannelSettings={props.viewerChannelSettings}
            getMetadata={getMetadata}
          />
        </Sider>
        <Layout className="cell-viewer-wrapper" style={{ margin: props.canvasMargin }}>
          <Content>
            <Toolbar
              fovDownloadHref={props.parentImageDownloadHref}
              cellDownloadHref={props.imageDownloadHref}
              hasParentImage={!!props.parentImageUrl}
              hasCellId={!!props.cellId}
              canPathTrace={view3d ? view3d.hasWebGL2() : false}
              resetCamera={resetCamera}
              downloadScreenshot={saveScreenshot}
              visibleControls={visibleControls}
            />
            <CellViewerCanvasWrapper
              view3d={view3d}
              image={image}
              loadingImage={sendingQueryRequest}
              numSlices={numSlices}
              numSlicesLoaded={numSlicesLoaded}
              numTimesteps={numTimesteps}
              numScenes={numScenes}
              playControls={playControls}
              playingAxis={playingAxis}
              appHeight={props.appHeight}
              visibleControls={visibleControls}
              clippingPanelOpen={clippingPanelOpen}
              onClippingPanelOpenChange={onClippingPanelOpenChange}
            />
          </Content>
        </Layout>
      </Layout>
    </StyleProvider>
  );
};

export default App;
