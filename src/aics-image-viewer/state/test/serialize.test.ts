import type { CameraState } from "@aics/vole-core";
import { describe, expect, it } from "vitest";

import { getDefaultCameraState } from "../../shared/constants";
import {
  cameraStateToSnapshot,
  channelStateToSnapshot,
  channelStateToStringSnapshot,
  objectToKeyValueList,
  stringifyCameraStateSnapshot,
  viewerStateToSnapshot,
  viewerStateToStringSnapshot,
} from "../serialize";
import type { ViewerState } from "../types";
import {
  CUSTOM_TEST_CHANNEL_STATE,
  CUSTOM_TEST_VIEWER_STATE,
  DEFAULT_TEST_CHANNEL_STATE,
  DEFAULT_TEST_VIEWER_STATE,
  SERIALIZED_CUSTOM_TEST_CHANNEL_STATE,
  SERIALIZED_CUSTOM_TEST_VIEWER_STATE,
  SERIALIZED_DEFAULT_TEST_CHANNEL_STATE,
  SERIALIZED_DEFAULT_TEST_VIEWER_STATE,
  STRINGIFIED_CUSTOM_TEST_CHANNEL_STATE,
  STRINGIFIED_CUSTOM_TEST_VIEWER_STATE,
  STRINGIFIED_DEFAULT_TEST_CHANNEL_STATE,
  STRINGIFIED_DEFAULT_TEST_VIEWER_STATE,
} from "./test_data";

describe("channelStateToSnapshot", () => {
  it("serializes channel settings", () => {
    const serialized = channelStateToSnapshot(DEFAULT_TEST_CHANNEL_STATE, false);
    expect(serialized).toEqual(SERIALIZED_DEFAULT_TEST_CHANNEL_STATE);
  });

  it("serializes custom channel settings", () => {
    const serialized = channelStateToSnapshot(CUSTOM_TEST_CHANNEL_STATE, false);
    expect(serialized).toEqual(SERIALIZED_CUSTOM_TEST_CHANNEL_STATE);
  });
});

describe("channelStateToStringSnapshot", () => {
  it("serializes channel settings", () => {
    const serialized = channelStateToStringSnapshot(DEFAULT_TEST_CHANNEL_STATE, false);
    expect(serialized).toEqual(STRINGIFIED_DEFAULT_TEST_CHANNEL_STATE);
  });

  it("serializes custom channel settings", () => {
    const serialized = channelStateToStringSnapshot(CUSTOM_TEST_CHANNEL_STATE, false);
    expect(serialized).toEqual(STRINGIFIED_CUSTOM_TEST_CHANNEL_STATE);
  });
});

describe("viewerStateToSnapshot", () => {
  it("serializes the default viewer settings", () => {
    const serialized = viewerStateToSnapshot(DEFAULT_TEST_VIEWER_STATE, false);
    expect(serialized).toEqual(SERIALIZED_DEFAULT_TEST_VIEWER_STATE);
  });

  it("serializes custom viewer settings", () => {
    const serialized = viewerStateToSnapshot(CUSTOM_TEST_VIEWER_STATE, false);
    expect(serialized).toEqual(SERIALIZED_CUSTOM_TEST_VIEWER_STATE);
  });
});

describe("viewerStateToStringSnapshot", () => {
  it("serializes the default viewer settings", () => {
    const serialized = viewerStateToStringSnapshot(DEFAULT_TEST_VIEWER_STATE, false);
    expect(serialized).toEqual(STRINGIFIED_DEFAULT_TEST_VIEWER_STATE);
  });

  it("serializes custom viewer settings", () => {
    const serialized = viewerStateToStringSnapshot(CUSTOM_TEST_VIEWER_STATE, false);
    expect(serialized).toEqual(STRINGIFIED_CUSTOM_TEST_VIEWER_STATE);
  });

  it("shortens long numbers in the slice and region parameters", () => {
    // Floats should be rounded to 7 significant digits or less
    let state: Partial<ViewerState> = {
      region: { x: [0.4566666666, 0.8667332], y: [0.49999999, 0.8999999], z: [0.3000000001, 0.16467883] },
      slice: { x: 0.41111186, y: 0.49999999, z: 0.677402 },
    };
    let serializedState = viewerStateToStringSnapshot(state, true);
    expect(serializedState.reg).toEqual("0.4566667:0.8667332,0.5:0.8999999,0.3:0.1646788");
    expect(serializedState.slice).toEqual("0.4111119,0.5,0.677402");
  });
});

describe("Camera state", () => {
  it("uses default camera state when choosing elements to exclude/ignore", () => {
    let cameraState: CameraState = getDefaultCameraState();
    // No changes from default
    expect(cameraStateToSnapshot(cameraState, true)).toEqual(undefined);

    cameraState = { ...cameraState, position: [1, 2, 3] };
    const snapshot = cameraStateToSnapshot(cameraState, true)!;
    expect(snapshot).toEqual({ pos: [1, 2, 3] });
    const stringified = stringifyCameraStateSnapshot(snapshot);
    expect(objectToKeyValueList(stringified)).toEqual("pos:1:2:3");
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
