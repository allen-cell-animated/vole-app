import type { CameraState } from "@aics/vole-core";

import { getDefaultCameraState } from "../../shared/constants";
import { serializeCameraState, serializeViewerChannelSetting, serializeViewerState } from "../serialize";
import type { ChannelState, ViewerChannelStateParams, ViewerState } from "../types";
import {
  CUSTOM_VIEWER_STATE,
  DEFAULT_CHANNEL_STATE,
  DEFAULT_SERIALIZED_CHANNEL_STATE,
  DEFAULT_VIEWER_STATE,
  SERIALIZED_CUSTOM_VIEWER_STATE,
  SERIALIZED_DEFAULT_VIEWER_STATE,
} from "./test_data";

describe("serializeViewerChannelSetting", () => {
  it("serializes channel settings", () => {
    expect(serializeViewerChannelSetting(DEFAULT_CHANNEL_STATE, false)).toEqual(DEFAULT_SERIALIZED_CHANNEL_STATE);
  });

  it("serializes custom channel settings", () => {
    const customChannelState: ChannelState = {
      name: "a",
      displayName: "a",
      color: [3, 255, 157],
      volumeEnabled: false,
      isosurfaceEnabled: false,
      isovalue: 0,
      opacity: 0.54,
      colorizeEnabled: false,
      colorizeAlpha: 1.0,
      useControlPoints: false,
      controlPoints: [],
      ramp: [0, 255],
      // TODO: the settings below are not serialized. should they be? (see #384)
      plotMin: 0,
      plotMax: 255,
      keepIntensityRange: false,
    };
    const serializedCustomChannelState: Required<Omit<ViewerChannelStateParams, "lut" | "rmp" | "cps">> = {
      col: "03ff9d",
      ven: "0",
      sen: "0",
      isv: "0",
      isa: "0.54",
      clz: "0",
      cza: "1",
      cpe: "0",
      cpt: "",
      ram: "0:255",
      pin: "0",
    };
    expect(serializeViewerChannelSetting(customChannelState, false)).toEqual(serializedCustomChannelState);
  });
});

describe("serializeViewerState", () => {
  it("serializes the default viewer settings", () => {
    expect(serializeViewerState(DEFAULT_VIEWER_STATE, false)).toEqual(SERIALIZED_DEFAULT_VIEWER_STATE);
  });

  it("serializes custom viewer settings", () => {
    expect(serializeViewerState(CUSTOM_VIEWER_STATE, false)).toEqual(SERIALIZED_CUSTOM_VIEWER_STATE);
  });

  it("shortens long numbers in the slice and region parameters", () => {
    // Floats should be rounded to 7 significant digits or less
    let state: Partial<ViewerState> = {
      region: { x: [0.4566666666, 0.8667332], y: [0.49999999, 0.8999999], z: [0.3000000001, 0.16467883] },
      slice: { x: 0.41111186, y: 0.49999999, z: 0.677402 },
    };
    let serializedState = serializeViewerState(state, true);
    expect(serializedState.reg).toEqual("0.4566667:0.8667332,0.5:0.8999999,0.3:0.1646788");
    expect(serializedState.slice).toEqual("0.4111119,0.5,0.677402");
  });
});

describe("Camera state", () => {
  it("uses default camera state when choosing elements to exclude/ignore", () => {
    let cameraState: CameraState = {
      ...getDefaultCameraState(),
    };
    // No changes from default
    expect(serializeCameraState(cameraState, true)).toEqual(undefined);

    cameraState = { ...cameraState, position: [1, 2, 3] };
    expect(serializeCameraState(cameraState, true)).toEqual("pos:1:2:3");
  });

  it("default camera state has not been changed", () => {
    // The default camera state should NOT change unless backwards compatibility
    // is added to ensure old links still maintain the same camera orientation;
    // otherwise, cameras will appear in the new default orientation unexpectedly.
    expect(getDefaultCameraState()).toEqual({
      position: [0, 0, 5],
      target: [0, 0, 0],
      up: [0, 1, 0],
      fov: 20,
      orthoScale: 0.5,
    });
  });
});
