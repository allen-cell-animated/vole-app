import type { CameraState, ControlPoint } from "@aics/vole-core";

import type { ImageType, RenderMode, ViewMode } from "../shared/enums";
import type { PerAxis } from "../shared/types";
import type { ColorArray } from "../shared/utils/colorRepresentations";

/** Global (not per-channel) viewer state which may be changed in the UI */
export type ViewerState = {
  viewMode: ViewMode;
  renderMode: RenderMode;
  imageType: ImageType;
  showAxes: boolean;
  showBoundingBox: boolean;
  boundingBoxColor: ColorArray;
  backgroundColor: ColorArray;
  autorotate: boolean;
  maskAlpha: number;
  brightness: number;
  density: number;
  levels: [number, number, number];
  interpolationEnabled: boolean;
  // `region` values are in the range [0, 1]. We derive from this the format that the sliders expect
  // (integers between 0 and num_slices - 1) and the format that view3d expects (in [-0.5, 0.5]).
  // This state is only active in 3d mode.
  region: PerAxis<[number, number]>;
  // Store the relative position of the slice in the range [0, 1] for each of 3 axes.
  // This state is active in x,y,z single slice modes.
  slice: PerAxis<number>;
  time: number;
  scene: number;
  cameraState: Partial<CameraState> | undefined;
};

export type ChannelState = {
  name: string;
  displayName: string;
  volumeEnabled: boolean;
  isosurfaceEnabled: boolean;
  isovalue: number;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  opacity: number;
  color: ColorArray;
  ramp: [number, number];
  useControlPoints: boolean;
  controlPoints: ControlPoint[];
  plotMin: number;
  plotMax: number;
};
