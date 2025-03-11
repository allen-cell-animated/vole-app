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

  // The inner level of array(s), if present, groups multiple sources into a single volume with all sources' channels.
  // If there is an outer array level, it groups multiple volumes into a single multi-scene collection.
  // To clarify:
  // - A bare string is a single volume scene with a single source.
  // - An array of only strings is interpreted as a single volume with multiple sources, not a multi-scene collection.
  // - An array of strings *or* string arrays is a multi-scene collection, and all strings within the top-level array
  //   are treated as if they were string arrays with one element (i.e. volumes with one source).
  imageUrl: string | string[] | MultisceneUrls;
  parentImageUrl?: string | string[] | MultisceneUrls;

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
  metadata?: MetadataRecord;

  view3dRef?: MutableRefObject<View3d | null>;
  metadataFormatter?: (metadata: MetadataRecord) => MetadataRecord;
  onControlPanelToggle?: (collapsed: boolean) => void;
}
