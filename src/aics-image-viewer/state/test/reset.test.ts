import { describe, expect, it } from "@jest/globals";

import type { ChannelState, ViewerState } from "../../components/ViewerStateProvider/types";
import { getDefaultCameraState, getDefaultChannelState, getDefaultViewerState } from "../../shared/constants";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import { useViewerState } from "../store";

const arbitraryViewerState = (): ViewerState => ({
  viewMode: ViewMode.xy,
  renderMode: RenderMode.pathTrace,
  imageType: ImageType.fullField,
  showAxes: true,
  showBoundingBox: true,
  boundingBoxColor: [0, 255, 0],
  backgroundColor: [255, 255, 0],
  autorotate: true,
  maskAlpha: 255,
  brightness: 0,
  density: 0,
  levels: [253, 254, 255],
  interpolationEnabled: false,
  region: { x: [0, 0], y: [0, 0], z: [0, 0] },
  slice: { x: 3, y: 3, z: 3 },
  time: 12,
  scene: 3,
  cameraState: undefined,
});

const arbitraryChannelState = (): ChannelState => ({
  name: "foo",
  displayName: "foo",
  volumeEnabled: true,
  isosurfaceEnabled: true,
  isovalue: 77,
  colorizeEnabled: true,
  colorizeAlpha: 88,
  opacity: 0.5,
  color: [0, 0, 255],
  ramp: [12, 13],
  useControlPoints: true,
  controlPoints: [
    { x: 0, opacity: 0, color: [255, 0, 0] },
    { x: 100, opacity: 1, color: [0, 255, 0] },
  ],
  plotMin: 50,
  plotMax: 85,
});

const multipleArbitraryChannels = (): ChannelState[] => [
  { ...arbitraryChannelState(), name: "one", displayName: "one", volumeEnabled: false },
  { ...arbitraryChannelState(), name: "two", displayName: "two", volumeEnabled: false },
  { ...arbitraryChannelState(), name: "three", displayName: "three" },
  { ...arbitraryChannelState(), name: "fish", displayName: "fish", volumeEnabled: true },
];

const checkViewerState = (state: ViewerState, exclude: readonly (keyof ViewerState)[] = []): void => {
  const defaultState = {
    ...getDefaultViewerState(),
    cameraState: getDefaultCameraState(ViewMode.threeD),
  };
  const allStateKeys = Object.keys(defaultState) as (keyof ViewerState)[];
  const stateKeys = allStateKeys.filter((key) => !exclude.includes(key));

  for (const key of stateKeys) {
    expect(defaultState[key]).toEqual(state[key]);
  }
};

const checkChannelState = (index: number, state: ChannelState, exclude: readonly (keyof ChannelState)[]): void => {
  const defaultState = getDefaultChannelState(index);
  const allStateKeys = Object.keys(defaultState) as (keyof ChannelState)[];
  const stateKeys = allStateKeys.filter((key) => !exclude.includes(key));

  for (const key of stateKeys) {
    expect(defaultState[key]).toEqual(state[key]);
  }
};

describe("reset state", () => {
  describe("resetToDefaultViewerState", () => {
    it("resets to the default viewer state", () => {
      useViewerState.setState(arbitraryViewerState());
      useViewerState.getState().resetToDefaultViewerState();
      checkViewerState(useViewerState.getState());
    });

    it("resets most properties to their defaults", () => {
      useViewerState.getState().initChannelSettings(multipleArbitraryChannels());
      useViewerState.getState().resetToDefaultViewerState();

      const notResetKeys: (keyof ChannelState)[] = [
        "name",
        "displayName",
        "volumeEnabled",
        "controlPoints",
        "ramp",
        "plotMin",
        "plotMax",
      ];
      useViewerState.getState().channelSettings.forEach((channel, index) => {
        checkChannelState(index, channel, notResetKeys);
      });
    });

    it("preserves each channel's original names and transfer function configs", () => {
      const arbitraryChannels = multipleArbitraryChannels();
      useViewerState.getState().initChannelSettings(arbitraryChannels);
      useViewerState.getState().resetToDefaultViewerState();

      useViewerState.getState().channelSettings.forEach((channel, index) => {
        const originalChannel = arbitraryChannels[index];
        expect(channel.name).toEqual(originalChannel.name);
        expect(channel.displayName).toEqual(originalChannel.displayName);
        expect(channel.controlPoints).toEqual(originalChannel.controlPoints);
        expect(channel.ramp).toEqual(originalChannel.ramp);
        expect(channel.plotMin).toEqual(originalChannel.plotMin);
        expect(channel.plotMax).toEqual(originalChannel.plotMax);
      });
    });

    it("sets only the first three channels to have volumes enabled", () => {
      useViewerState.getState().initChannelSettings(multipleArbitraryChannels());
      useViewerState.getState().resetToDefaultViewerState();

      const { channelSettings } = useViewerState.getState();
      expect(channelSettings[0].volumeEnabled).toBe(true);
      expect(channelSettings[1].volumeEnabled).toBe(true);
      expect(channelSettings[2].volumeEnabled).toBe(true);
      expect(channelSettings[3].volumeEnabled).toBe(false);
    });
  });

  describe("resetToSavedViewerState", () => {
    // it(() => {});
  });
});
