import type { RawArrayData, RawArrayInfo, View3d, Volume } from "@aics/vole-core";
import { MutableRefObject } from "react";

import type { MetadataRecord } from "../../shared/types";
import type { ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";
import type { ViewerState } from "../ViewerStateProvider/types";

/** `typeof useEffect`, but the effect handler takes a `Volume` as an argument */
export type UseImageEffectType = (effect: (image: Volume) => void | (() => void), deps: React.DependencyList) => void;

type ControlNames =
  | "alphaMaskSlider"
  | "autoRotateButton"
  | "axisClipSliders"
  | "brightnessSlider"
  | "backgroundColorPicker"
  | "boundingBoxColorPicker"
  | "colorPresetsDropdown"
  | "densitySlider"
  | "levelsSliders"
  | "interpolationControl"
  | "saveSurfaceButtons"
  | "fovCellSwitchControls"
  | "viewModeRadioButtons"
  | "resetCameraButton"
  | "showAxesButton"
  | "showBoundingBoxButton"
  | "metadataViewer";
/** Show/hide different elements of the UI */
export type ControlVisibilityFlags = { [K in ControlNames]: boolean };

export type MultisceneUrls = { scenes: (string | string[])[] };

export interface AppProps {
  // FIRST WAY TO GET DATA INTO THE VIEWER: pass in volume data directly

  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData?: RawArrayData;
  // rawDims is a small amount of metadata (e.g. dimensions and channel names) to be converted internally to an ImageInfo
  rawDims?: RawArrayInfo;

  // SECOND WAY TO GET DATA INTO THE VIEWER: (if `rawData`/`rawDims` isn't present) pass in URL(s) to fetch volume data

  /**
   * URL(s) from which to fetch the image. You can pass a `string` to load from a single data source, or get fancier:
   * - Pass an array of strings to assemble a single volume with all sources' channels, in order.
   * - Pass an object with a key `scenes: (string | string[])[]` to load multiple volumes as a *multi-scene collection*.
   *   Each string or string array within the `scenes` array is treated as a single volume with one or more sources.
   */
  imageUrl: string | MultisceneUrls;
  parentImageUrl?: string | MultisceneUrls;

  viewerChannelSettings?: ViewerChannelSettings;

  appHeight: string;
  cellId: string;
  visibleControls?: Partial<ControlVisibilityFlags>;
  viewerSettings?: Partial<ViewerState>;
  imageDownloadHref: string;
  parentImageDownloadHref: string;
  pixelSize?: [number, number, number];
  canvasMargin: string;
  transform?: {
    translation: [number, number, number];
    rotation: [number, number, number];
  };
  metadata?: MetadataRecord | MetadataRecord[];

  view3dRef?: MutableRefObject<View3d | null>;
  metadataFormatter?: (metadata: MetadataRecord) => MetadataRecord;
  onControlPanelToggle?: (collapsed: boolean) => void;
}
