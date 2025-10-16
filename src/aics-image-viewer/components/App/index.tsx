// 3rd Party Imports
import { RawArrayLoaderOptions, View3d, Volume } from "@aics/vole-core";
import { Layout } from "antd";
import { debounce, isEqual } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AXIS_MARGIN_DEFAULT,
  CLIPPING_PANEL_HEIGHT_DEFAULT,
  CLIPPING_PANEL_HEIGHT_TALL,
  CONTROL_PANEL_CLOSE_WIDTH,
  DTYPE_RANGE,
  getDefaultViewerChannelSettings,
  getDefaultViewerState,
  SCALE_BAR_MARGIN_DEFAULT,
} from "../../shared/constants";
import { ImageType, ViewMode } from "../../shared/enums";
import type { IsosurfaceFormat, MetadataRecord, PerAxis } from "../../shared/types";
import {
  controlPointsToRamp,
  initializeLut,
  rampToControlPoints,
  remapControlPointsForChannel,
} from "../../shared/utils/controlPointsToLut";
import { useConstructor } from "../../shared/utils/hooks";
import { select, useViewerState } from "../../state/store";
import { subscribeImageToState, subscribeViewToState } from "../../state/subscribers";
import useVolume, { ImageLoadStatus } from "../useVolume";
import type { AppProps, ControlVisibilityFlags, MultisceneUrls, UseImageEffectType } from "./types";

import CellViewerCanvasWrapper from "../CellViewerCanvasWrapper";
import ControlPanel from "../ControlPanel";
import { useErrorAlert } from "../ErrorAlert";
import StyleProvider from "../StyleProvider";
import Toolbar from "../Toolbar";
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

const App: React.FC<AppProps> = (props) => {
  props = { ...defaultProps, ...props };

  // State management /////////////////////////////////////////////////////////
  const imageType = useViewerState(select("imageType"));
  const viewMode = useViewerState(select("viewMode"));
  const scene = useViewerState(select("scene"));
  const time = useViewerState(select("time"));
  const showAxes = useViewerState(select("showAxes"));
  const channelSettings = useViewerState(select("channelSettings"));
  const changeChannelSetting = useViewerState(select("changeChannelSetting"));
  const applyColorPresets = useViewerState(select("applyColorPresets"));
  const resetToSavedState = useViewerState(select("resetToSavedViewerState"));

  const resetToSavedViewerState = useCallback(
    () => resetToSavedState(props.viewerSettings, props.viewerChannelSettings),
    [resetToSavedState, props.viewerSettings, props.viewerChannelSettings]
  );

  const view3d = useConstructor(() => new View3d());
  if (props.view3dRef !== undefined) {
    props.view3dRef.current = view3d;
  }

  const [errorAlert, showError] = useErrorAlert();

  useEffect(() => {
    // Get notifications of loading errors which occur after the initial load, e.g. on time change or new channel load
    view3d.setLoadErrorHandler((_vol, e) => showError(e));
    return () => view3d.setLoadErrorHandler(undefined);
  }, [view3d, showError]);

  const imageUrlRef = useRef<string | string[] | MultisceneUrls>("");
  const scenesRef = useRef<(string | string[])[] | [RawArrayLoaderOptions]>([]);
  const { imageUrl, parentImageUrl, rawData, rawDims } = props;
  const scenes = useMemo((): (string | string[])[] | [RawArrayLoaderOptions] => {
    if (rawData && rawDims) {
      return [{ data: rawData, metadata: rawDims }];
    } else {
      const showParentImage = imageType === ImageType.fullField && parentImageUrl !== undefined;
      const path = showParentImage ? parentImageUrl : imageUrl;
      // Don't reload if we're already looking at this image
      if (isEqual(path, imageUrlRef.current)) {
        return scenesRef.current;
      }
      imageUrlRef.current = path;

      const result = (path as MultisceneUrls).scenes ?? [path];
      scenesRef.current = result;
      return result;
    }
  }, [imageUrl, parentImageUrl, rawData, rawDims, imageType]);

  const maskChannelName = props.viewerChannelSettings?.maskChannelName;

  // we need to keep track of channel ranges for remapping control points
  const channelRangesRef = useRef<([number, number] | undefined)[]>([]);

  const removePreviousImage = useRef<(() => void) | undefined>(undefined);

  const onCreateImage = useCallback(
    (newImage: Volume): void => {
      removePreviousImage.current?.();

      if (newImage === null) {
        return;
      }

      channelRangesRef.current = new Array(newImage.channelNames.length).fill(undefined);

      const { channelSettings } = useViewerState.getState();

      view3d.addVolume(newImage, {
        // Immediately passing down channel parameters isn't strictly necessary, but keeps things looking consistent on load
        channels: newImage.channelNames.map((name) => {
          // TODO do we really need to be searching by name here?
          const ch = channelSettings.find((channel) => channel.name === name);
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

      view3d.updateActiveChannels(newImage);
      const unsubscribeView = subscribeViewToState(useViewerState, view3d);
      const unsubscribeImage = subscribeImageToState(useViewerState, view3d, newImage);
      removePreviousImage.current = () => {
        unsubscribeView();
        unsubscribeImage();
        view3d.removeAllVolumes();
        removePreviousImage.current = undefined;
      };
    },
    [view3d]
  );

  const onChannelLoaded = useCallback(
    (image: Volume, channelIndex: number, isInitialLoad: boolean): void => {
      // TODO this was once a search by name - is that still necessary or will the index always be correct?
      const thisChannelSettings = channelSettings[channelIndex];
      const viewerState = useViewerState.getState();
      const { channelsToResetOnLoad, useDefaultViewerChannelSettings } = viewerState;
      const currentViewerChannelSettings = useDefaultViewerChannelSettings
        ? getDefaultViewerChannelSettings()
        : props.viewerChannelSettings;
      const thisChannel = image.getChannel(channelIndex);
      const noLut = !thisChannelSettings || !thisChannelSettings.controlPoints || !thisChannelSettings.ramp;

      if (isInitialLoad || noLut || channelsToResetOnLoad.includes(channelIndex)) {
        // This channel needs its LUT initialized
        const { ramp, controlPoints } = initializeLut(image, channelIndex, currentViewerChannelSettings);
        const { dtype } = thisChannel;

        changeChannelSetting(channelIndex, {
          controlPoints: controlPoints,
          ramp: controlPointsToRamp(ramp),
          // set the default range of the transfer function editor to cover the full range of the data type
          plotMin: DTYPE_RANGE[dtype].min,
          plotMax: DTYPE_RANGE[dtype].max,
        });
      } else {
        // This channel has already been initialized, but its LUT was just remapped and we need to update some things
        const oldRange = channelRangesRef.current[channelIndex];
        if (thisChannelSettings.useControlPoints) {
          // control points were just automatically remapped - update in state
          const rampControlPoints = rampToControlPoints(thisChannelSettings.ramp);
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
          const { controlPoints } = thisChannelSettings;
          const remappedControlPoints = remapControlPointsForChannel(controlPoints, oldRange, thisChannel);
          changeChannelSetting(channelIndex, { controlPoints: remappedControlPoints, ramp: ramp });
        }
      }

      // save the channel's new range for remapping next time
      channelRangesRef.current[channelIndex] = [thisChannel.rawMin, thisChannel.rawMax];

      view3d.updateLuts(image);
      view3d.onVolumeData(image, [channelIndex]);

      if (image.channelNames[channelIndex] === maskChannelName) {
        view3d.setVolumeChannelAsMask(image, channelIndex);
      }
      if (image.isLoaded()) {
        view3d.updateActiveChannels(image);
      }
    },
    [view3d, channelSettings, changeChannelSetting, maskChannelName, props.viewerChannelSettings]
  );

  const volume = useVolume(scenes, {
    viewerChannelSettings: props.viewerChannelSettings,
    onCreateImage,
    onChannelLoaded,
    onError: showError,
    maskChannelName,
  });
  const { image, setTime, setScene } = volume;

  const hasRawImage = !!(props.rawData && props.rawDims);
  const numScenes = hasRawImage ? 1 : ((props.imageUrl as MultisceneUrls).scenes?.length ?? 1);
  const numSlices: PerAxis<number> = image?.imageInfo.volumeSize ?? { x: 1, y: 1, z: 1 };
  const numSlicesLoaded: PerAxis<number> = image?.imageInfo.subregionSize ?? { x: 0, y: 0, z: 0 };
  const numTimesteps = image?.imageInfo.times ?? 1;

  // const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});
  const [controlPanelClosed, setControlPanelClosed] = useState(() => window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH);
  // Only allow auto-close once while the screen is too narrow.
  const [hasAutoClosedControlPanel, setHasAutoClosedControlPanel] = useState(false);

  const [clippingPanelOpen, setClippingPanelOpen] = useState(true);
  const clippingPanelOpenTimeout = useRef<number>(0);

  // Imperative callbacks /////////////////////////////////////////////////////

  const saveIsosurface = useCallback(
    (channelIndex: number, type: IsosurfaceFormat): void => {
      if (image) view3d.saveChannelIsosurface(image, channelIndex, type);
    },
    [image, view3d]
  );

  const saveScreenshot = useCallback((): void => {
    view3d.capture((dataUrl: string) => {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = "screenshot.png";
      anchor.click();
    });
  }, [view3d]);

  const { metadata, metadataFormatter } = props;
  const getMetadata = useCallback((): MetadataRecord => {
    let imageMetadata = image?.imageMetadata as MetadataRecord;
    if (imageMetadata && metadataFormatter) {
      imageMetadata = metadataFormatter(imageMetadata);
    }

    let sceneMeta: MetadataRecord | undefined;
    if (Array.isArray(metadata)) {
      // If metadata is an array, try to index it by scene
      if (metadata.length >= numScenes) {
        sceneMeta = metadata[scene];
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
  }, [metadata, metadataFormatter, image, numScenes, scene]);

  useEffect((): void => {
    const hasTime = numTimesteps > 1;
    const hasScenes = numScenes > 1;
    const mode3d = viewMode === ViewMode.threeD;

    setIndicatorPositions(view3d, clippingPanelOpen, hasTime, hasScenes, mode3d);

    // Hide indicators while clipping panel is in motion - otherwise they pop to the right place prematurely
    if (clippingPanelOpen) {
      view3d.setShowScaleBar(false);
      view3d.setShowTimestepIndicator(false);
      view3d.setShowAxis(false);

      window.clearTimeout(clippingPanelOpenTimeout.current);
      clippingPanelOpenTimeout.current = window.setTimeout(() => {
        view3d.setShowScaleBar(true);
        view3d.setShowTimestepIndicator(true);
        if (showAxes) {
          view3d.setShowAxis(true);
        }
      }, CLIPPING_PANEL_ANIMATION_DURATION_MS);
    }
  }, [view3d, numTimesteps, numScenes, viewMode, showAxes, clippingPanelOpen]);

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

  const { onControlPanelToggle } = props;
  useEffect(
    () => onControlPanelToggle && onControlPanelToggle(controlPanelClosed),
    [controlPanelClosed, onControlPanelToggle]
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
      if (image && volume.imageLoadStatus === ImageLoadStatus.LOADED) {
        return effect(image);
      }
      // react-hooks will check that `deps` match `effect`'s dependencies, so we can safely exclude `effect` here
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, image, volume.imageLoadStatus]);
  };

  // Effects to imperatively sync `viewerSettings` to `view3d`

  useImageEffect(
    (image) => {
      // Check whether any channels are marked to be reset and apply it.
      const viewerState = useViewerState.getState();
      const { channelsToReset, onResetChannel, useDefaultViewerChannelSettings } = viewerState;
      const currentViewerChannelSettings = useDefaultViewerChannelSettings
        ? getDefaultViewerChannelSettings()
        : props.viewerChannelSettings;
      for (let i = 0; i < channelSettings.length; i++) {
        if (channelsToReset.includes(i)) {
          const { ramp, controlPoints } = initializeLut(image, i, currentViewerChannelSettings);
          changeChannelSetting(i, { controlPoints: controlPoints, ramp: controlPointsToRamp(ramp) });
          onResetChannel(i);
        }
      }
    },
    [changeChannelSetting, channelSettings, props.viewerChannelSettings]
  );

  // `time` and `scene` have their own special handlers via `volume`, since they both trigger loads
  useEffect(() => setTime(view3d, time), [view3d, time, setTime]);
  useEffect(() => setScene(scene), [scene, setScene]);

  useImageEffect(
    (currentImage) => view3d.setVolumeTranslation(currentImage, props.transform?.translation || [0, 0, 0]),
    [props.transform?.translation, view3d]
  );

  useImageEffect(
    (currentImage) => view3d.setVolumeRotation(currentImage, props.transform?.rotation || [0, 0, 0]),
    [props.transform?.rotation, view3d]
  );

  // Rendering ////////////////////////////////////////////////////////////////

  const visibleControls = useMemo(
    (): ControlVisibilityFlags => ({ ...defaultVisibleControls, ...props.visibleControls }),
    [props.visibleControls]
  );
  const pixelSize = useMemo(
    (): [number, number, number] => (image ? image.imageInfo.physicalPixelSize.toArray() : [1, 1, 1]),
    [image]
  );
  const resetCamera = useMemo(() => view3d.resetCamera.bind(view3d), [view3d]);

  return (
    <StyleProvider>
      {errorAlert}
      <Layout className="cell-viewer-app" style={{ height: props.appHeight }}>
        {channelSettings.map(({ name }, index) => (
          <ChannelUpdater
            key={`${index}_${name}`}
            index={index}
            view3d={view3d}
            image={image}
            version={volume.channelVersions[index]}
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
            channelGroupedByType={volume.channelGroupedByType}
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
              resetToSavedViewerState={resetToSavedViewerState}
              visibleControls={visibleControls}
            />
            <CellViewerCanvasWrapper
              view3d={view3d}
              image={image}
              loadingImage={volume.imageLoadStatus === ImageLoadStatus.REQUESTED}
              numSlices={numSlices}
              numSlicesLoaded={numSlicesLoaded}
              numTimesteps={numTimesteps}
              numScenes={numScenes}
              playControls={volume.playControls}
              playingAxis={volume.playingAxis}
              appHeight={props.appHeight}
              visibleControls={visibleControls}
              clippingPanelOpen={clippingPanelOpen}
              onClippingPanelOpenChange={setClippingPanelOpen}
            />
          </Content>
        </Layout>
      </Layout>
    </StyleProvider>
  );
};

export default App;
