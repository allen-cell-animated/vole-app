// 3rd Party Imports
import { RENDERMODE_PATHTRACE, RENDERMODE_RAYMARCH, View3d } from "@aics/vole-core";
import type { RawArrayLoaderOptions, Volume } from "@aics/vole-core";
import { Layout } from "antd";
import { debounce, isEqual } from "lodash";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  AXIS_MARGIN_DEFAULT,
  CLIPPING_PANEL_HEIGHT_DEFAULT,
  CLIPPING_PANEL_HEIGHT_TALL,
  CONTROL_PANEL_CLOSE_WIDTH,
  DTYPE_RANGE,
  getDefaultViewerState,
  SCALE_BAR_MARGIN_DEFAULT,
} from "../../shared/constants";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import type { AxisName, IsosurfaceFormat, MetadataRecord, PerAxis } from "../../shared/types";
import { activeAxisMap } from "../../shared/types";
import { colorArrayToFloats } from "../../shared/utils/colorRepresentations";
import {
  controlPointsToRamp,
  initializeLut,
  rampToControlPoints,
  remapControlPointsForChannel,
} from "../../shared/utils/controlPointsToLut";
import { useConstructor } from "../../shared/utils/hooks";
import {
  alphaSliderToImageValue,
  brightnessSliderToImageValue,
  densitySliderToImageValue,
  gammaSliderToImageValues,
} from "../../shared/utils/sliderValuesToImageValues";
import { findFirstChannelMatch } from "../../shared/utils/viewerChannelSettings";
import useVolume, { ImageLoadStatus } from "../useVolume";
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
  showError: undefined,
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
  const viewerState = useContext(ViewerStateContext).ref;
  const {
    imageType,
    viewMode,
    channelSettings,
    changeChannelSetting,
    applyColorPresets,
    setSavedViewerChannelSettings,
    getCurrentViewerChannelSettings,
    // TODO: Show a loading spinner while any channels are awaiting reset.
    getChannelsAwaitingReset,
    onResetChannel,
  } = viewerState.current;
  const { onControlPanelToggle, onImageTitleChange, metadata, metadataFormatter } = props;

  useMemo(() => {
    if (props.viewerChannelSettings) {
      setSavedViewerChannelSettings(props.viewerChannelSettings);
    }
  }, [props.viewerChannelSettings, setSavedViewerChannelSettings]);

  const view3d = useConstructor(() => new View3d());
  if (props.view3dRef !== undefined) {
    props.view3dRef.current = view3d;
  }

  // Allows AppWrapper to pass in its own `useErrorAlert` callbacks, but still keeps error
  // messaging when App is used standalone.
  const [errorAlert, _showError] = useErrorAlert();
  const showError = props.showError ?? _showError;

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

  const maskChannelName = getCurrentViewerChannelSettings()?.maskChannelName;

  // we need to keep track of channel ranges for remapping control points
  const channelRangesRef = useRef<([number, number] | undefined)[]>([]);

  const onCreateImage = useCallback(
    (newImage: Volume): void => {
      if (newImage === null) {
        return;
      }

      const { channelNames } = newImage;
      channelRangesRef.current = new Array(channelNames.length).fill(undefined);

      const { channelSettings } = viewerState.current;

      // If the image has channel color metadata, apply those colors now
      const viewerChannelSettings = getCurrentViewerChannelSettings();
      const channelColorMeta = newImage.imageInfo.channelColors?.map((color, index) => {
        // Filter out channels that have colors in `viewerChannelSettings`
        if (viewerChannelSettings === undefined) {
          return color;
        }
        const settings = findFirstChannelMatch(channelNames[index], index, viewerChannelSettings);
        if (settings?.color !== undefined) {
          return undefined;
        } else {
          return color;
        }
      });
      if (Array.isArray(channelColorMeta)) {
        channelColorMeta.forEach((color, index) => {
          if (Array.isArray(color) && index < channelNames.length) {
            changeChannelSetting(index, { color });
          }
        });
      }

      view3d.addVolume(newImage, {
        // Immediately passing down channel parameters isn't strictly necessary, but keeps things looking consistent on load
        channels: newImage.channelNames.map((name, index) => {
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
            color: channelColorMeta?.[index] ?? ch.color,
          };
        }),
      });

      onImageTitleChange?.(newImage.imageInfo.imageInfo.name);
      view3d.updateActiveChannels(newImage);
    },
    [view3d, viewerState, onImageTitleChange, changeChannelSetting, getCurrentViewerChannelSettings]
  );

  const onChannelLoaded = useCallback(
    (image: Volume, channelIndex: number, isInitialLoad: boolean): void => {
      // TODO this was once a search by name - is that still necessary or will the index always be correct?
      const thisChannelSettings = channelSettings[channelIndex];
      const { getChannelsAwaitingResetOnLoad, getCurrentViewerChannelSettings, changeChannelSetting } =
        viewerState.current;
      const thisChannel = image.getChannel(channelIndex);
      const noLut = !thisChannelSettings || !thisChannelSettings.controlPoints || !thisChannelSettings.ramp;

      if (isInitialLoad || noLut || getChannelsAwaitingResetOnLoad().has(channelIndex)) {
        // This channel needs its LUT initialized
        const { ramp, controlPoints } = initializeLut(image, channelIndex, getCurrentViewerChannelSettings());
        const range = DTYPE_RANGE[thisChannel.dtype];

        changeChannelSetting(channelIndex, {
          controlPoints: controlPoints,
          ramp: controlPointsToRamp(ramp),
          // set the default range of the transfer function editor to cover the full range of the data type
          plotMin: range.min,
          plotMax: range.max,
          isovalue: range.min + (range.max - range.min) / 2,
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
    [view3d, channelSettings, maskChannelName, viewerState]
  );

  const onError = useCallback(
    (error: unknown) => {
      showError(error);
      onImageTitleChange?.(undefined);
    },
    [showError, onImageTitleChange]
  );

  const volume = useVolume(scenes, {
    onCreateImage,
    onChannelLoaded,
    onError,
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

  const viewerSettings = viewerState.current;

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

  const getMetadata = useCallback((): MetadataRecord => {
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
  }, [metadata, metadataFormatter, image, numScenes, viewerState]);

  useEffect((): void => {
    const hasTime = numTimesteps > 1;
    const hasScenes = numScenes > 1;
    const mode3d = viewerSettings.viewMode === ViewMode.threeD;

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
        if (viewerSettings.showAxes) {
          view3d.setShowAxis(true);
        }
      }, CLIPPING_PANEL_ANIMATION_DURATION_MS);
    }
  }, [view3d, numTimesteps, numScenes, viewerSettings.viewMode, viewerSettings.showAxes, clippingPanelOpen]);

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
    (_currentImage) => {
      view3d.setCameraMode(viewerSettings.viewMode);
      view3d.resize(null);
    },
    [viewerSettings.viewMode, view3d]
  );

  useImageEffect(
    (_currentImage) => {
      if (viewerSettings.cameraState) {
        view3d.setCameraState(viewerSettings.cameraState);
      }
    },
    [viewerSettings.cameraState, view3d]
  );

  useImageEffect(
    (_currentImage) => view3d.setAutoRotate(viewerSettings.autorotate),
    [viewerSettings.autorotate, view3d]
  );

  useImageEffect((_currentImage) => view3d.setShowAxis(viewerSettings.showAxes), [viewerSettings.showAxes, view3d]);

  useImageEffect(
    (_currentImage) => view3d.setBackgroundColor(colorArrayToFloats(viewerSettings.backgroundColor)),
    [viewerSettings.backgroundColor, view3d]
  );

  useImageEffect(
    (currentImage) => view3d.setBoundingBoxColor(currentImage, colorArrayToFloats(viewerSettings.boundingBoxColor)),
    [viewerSettings.boundingBoxColor, view3d]
  );

  useImageEffect(
    (currentImage) => view3d.setShowBoundingBox(currentImage, viewerSettings.showBoundingBox),
    [viewerSettings.showBoundingBox, view3d]
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
    [changeChannelSetting, channelSettings, getChannelsAwaitingReset, getCurrentViewerChannelSettings, onResetChannel]
  );

  useImageEffect(
    (currentImage) => {
      const renderMode = viewerSettings.renderMode;
      view3d.setMaxProjectMode(currentImage, renderMode === RenderMode.maxProject);
      view3d.setVolumeRenderMode(renderMode === RenderMode.pathTrace ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
      view3d.updateActiveChannels(currentImage);
    },
    [viewerSettings.renderMode, view3d]
  );

  useImageEffect(
    (currentImage) => {
      view3d.updateMaskAlpha(currentImage, alphaSliderToImageValue(viewerSettings.maskAlpha));
      view3d.updateActiveChannels(currentImage);
    },
    [viewerSettings.maskAlpha, view3d]
  );

  useImageEffect(
    (_currentImage) => {
      const brightness = brightnessSliderToImageValue(viewerSettings.brightness);
      view3d.updateExposure(brightness);
    },
    [viewerSettings.brightness, view3d]
  );

  useImageEffect(
    (currentImage) => {
      const density = densitySliderToImageValue(viewerSettings.density);
      view3d.updateDensity(currentImage, density);
    },
    [viewerSettings.density, view3d]
  );

  useImageEffect(
    (currentImage) => {
      const imageValues = gammaSliderToImageValues(viewerSettings.levels);
      view3d.setGamma(currentImage, imageValues.min, imageValues.scale, imageValues.max);
    },
    [viewerSettings.levels, view3d]
  );

  // `time` and `scene` have their own special handlers via `volume`, since they both trigger loads
  useEffect(() => setTime(view3d, viewerSettings.time), [view3d, viewerSettings.time, setTime]);
  useEffect(() => setScene(viewerSettings.scene), [viewerSettings.scene, setScene]);

  useImageEffect(
    (currentImage) => view3d.setInterpolationEnabled(currentImage, viewerSettings.interpolationEnabled),
    [viewerSettings.interpolationEnabled, view3d]
  );

  useImageEffect(
    (currentImage) => view3d.setVolumeTranslation(currentImage, props.transform?.translation || [0, 0, 0]),
    [props.transform?.translation, view3d]
  );

  useImageEffect(
    (currentImage) => view3d.setVolumeRotation(currentImage, props.transform?.rotation || [0, 0, 0]),
    [props.transform?.rotation, view3d]
  );

  const usePerAxisClippingUpdater = (
    axis: AxisName,
    [minval, maxval]: [number, number],
    slice: number,
    viewMode: ViewMode
  ): void => {
    useImageEffect(
      // Logic to determine axis clipping range, for each of x,y,z,3d slider:
      // if slider was same as active axis view mode:  [viewerSettings.slice[axis], viewerSettings.slice[axis] + 1.0/volumeSize[axis]]
      // if in 3d mode: viewerSettings.region[axis]
      // else: [0,1]
      (currentImage) => {
        let isOrthoAxis = false;
        let axismin = 0.0;
        let axismax = 1.0;
        if (viewMode === ViewMode.threeD) {
          axismin = minval;
          axismax = maxval;
          isOrthoAxis = false;
        } else {
          isOrthoAxis = activeAxisMap[viewMode] === axis;
          const oneSlice = 1 / currentImage.imageInfo.volumeSize[axis];
          axismin = isOrthoAxis ? slice : 0.0;
          axismax = isOrthoAxis ? slice + oneSlice : 1.0;
          if (axis === "z" && viewMode === ViewMode.xy) {
            view3d.setZSlice(currentImage, Math.floor(slice * currentImage.imageInfo.volumeSize.z));
          }
        }
        // view3d wants the coordinates in the -0.5 to 0.5 range
        view3d.setAxisClip(currentImage, axis, axismin - 0.5, axismax - 0.5, isOrthoAxis);
        view3d.setCameraMode(viewMode);
        // TODO under some circumstances, this effect will trigger a load. Ideally, this would be reflected in the load
        //   state managed by `useVolume`. This is complicated by the fact that the relevant methods (`setAxisClip` and
        //   `setZSlice`) don't provide a channel load callback like other load-triggering methods (e.g. `setTime`).
      },
      [axis, minval, maxval, slice, viewMode]
    );
  };

  usePerAxisClippingUpdater("x", viewerSettings.region.x, viewerSettings.slice.x, viewMode);
  usePerAxisClippingUpdater("y", viewerSettings.region.y, viewerSettings.slice.y, viewMode);
  usePerAxisClippingUpdater("z", viewerSettings.region.z, viewerSettings.slice.z, viewMode);

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
        {channelSettings.map((channelState, index) => (
          <ChannelUpdater
            key={`${index}_${channelState.name}`}
            {...{ channelState, index }}
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
