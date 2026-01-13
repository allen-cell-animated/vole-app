import { describe, expect, it } from "@jest/globals";

import { getDefaultCameraState, getDefaultChannelState, getDefaultViewerState } from "../../shared/constants";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import type { ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";
import type { ChannelState, ViewerState } from "../../state/types";
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
  keepIntensityRange: true,
});

const multipleArbitraryChannels = (): ChannelState[] => [
  { ...arbitraryChannelState(), name: "one", displayName: "one", volumeEnabled: false },
  { ...arbitraryChannelState(), name: "two", displayName: "two", volumeEnabled: false },
  { ...arbitraryChannelState(), name: "three", displayName: "three" },
  { ...arbitraryChannelState(), name: "fish", displayName: "fish", volumeEnabled: true },
];

/** We expect these keys of `ChannelState` to never be reset by the functions tested in this file */
const NOT_RESET_KEYS = ["name", "displayName", "volumeEnabled", "controlPoints", "ramp", "plotMin", "plotMax"] as const;

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
    it("resets viewer state properties to their defaults", () => {
      useViewerState.setState(arbitraryViewerState());
      useViewerState.getState().resetToDefaultViewerState();
      checkViewerState(useViewerState.getState());
    });

    it("resets most properties to their defaults", () => {
      useViewerState.getState().replaceAllChannelSettings(multipleArbitraryChannels());
      useViewerState.getState().resetToDefaultViewerState();

      useViewerState.getState().channelSettings.forEach((channel, index) => {
        checkChannelState(index, channel, NOT_RESET_KEYS);
      });
    });

    it("preserves each channel's original names and transfer function configs", () => {
      const arbitraryChannels = multipleArbitraryChannels();
      useViewerState.getState().replaceAllChannelSettings(arbitraryChannels);
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
      useViewerState.getState().replaceAllChannelSettings(multipleArbitraryChannels());
      useViewerState.getState().resetToDefaultViewerState();

      const { channelSettings } = useViewerState.getState();
      expect(channelSettings[0].volumeEnabled).toBe(true);
      expect(channelSettings[1].volumeEnabled).toBe(true);
      expect(channelSettings[2].volumeEnabled).toBe(true);
      expect(channelSettings[3].volumeEnabled).toBe(false);
    });

    it("sets `useDefaultViewerChannelSettings` to `true`", () => {
      useViewerState.getState().resetToSavedViewerState();
      useViewerState.getState().resetToDefaultViewerState();
      expect(useViewerState.getState().useDefaultViewerChannelSettings).toBe(true);
    });
  });

  describe("resetToSavedViewerState", () => {
    it('sets viewer state properties passed in as "saved," and resets all others', () => {
      const savedState: Partial<ViewerState> = {
        renderMode: RenderMode.pathTrace,
        brightness: 33,
        backgroundColor: [128, 128, 128],
        showAxes: true,
        time: 4,
      };
      const savedStateKeys = Object.keys(savedState) as (keyof ViewerState)[];

      useViewerState.setState(arbitraryViewerState());
      useViewerState.getState().resetToSavedViewerState(savedState);
      checkViewerState(useViewerState.getState(), savedStateKeys);

      const state = useViewerState.getState();
      expect(state.renderMode).toEqual(savedState.renderMode);
      expect(state.brightness).toEqual(savedState.brightness);
      expect(state.backgroundColor).toEqual(savedState.backgroundColor);
      expect(state.showAxes).toEqual(savedState.showAxes);
      expect(state.time).toEqual(savedState.time);
    });

    it("applies saved viewer channel settings", () => {
      const viewerChannelSettings: ViewerChannelSettings = {
        groups: [
          {
            name: "group",
            channels: [
              {
                match: ["one", "three"],
                surfaceEnabled: true,
                isovalue: 38,
                color: "ff00ff",
              },
              {
                match: "two",
                controlPointsEnabled: true,
                colorizeEnabled: true,
                colorizeAlpha: 27,
              },
            ],
          },
        ],
      };

      const arbitraryChannels = multipleArbitraryChannels();
      useViewerState.getState().replaceAllChannelSettings(arbitraryChannels);
      useViewerState.getState().resetToSavedViewerState({}, viewerChannelSettings);
      const { channelSettings } = useViewerState.getState();

      // Channel named "one" should have matched group 1 above
      checkChannelState(0, channelSettings[0], [...NOT_RESET_KEYS, "isosurfaceEnabled", "color", "isovalue"]);
      expect(channelSettings[0].isosurfaceEnabled).toBe(true);
      expect(channelSettings[0].color).toEqual([255, 0, 255]);
      expect(channelSettings[0].isovalue).toBe(38);

      // Channel named "two" should have matched group 2 above
      checkChannelState(1, channelSettings[1], [
        ...NOT_RESET_KEYS,
        "useControlPoints",
        "colorizeEnabled",
        "colorizeAlpha",
      ]);
      expect(channelSettings[1].useControlPoints).toBe(true);
      expect(channelSettings[1].colorizeEnabled).toBe(true);
      expect(channelSettings[1].colorizeAlpha).toBe(27);

      // Channel named "three" should have matched group 1 above
      checkChannelState(2, channelSettings[2], [...NOT_RESET_KEYS, "isosurfaceEnabled", "color", "isovalue"]);
      expect(channelSettings[2].isosurfaceEnabled).toBe(true);
      expect(channelSettings[2].color).toEqual([255, 0, 255]);
      expect(channelSettings[2].isovalue).toBe(38);

      // Channel named "fish" should not have matched any group and have default settings
      checkChannelState(3, channelSettings[3], NOT_RESET_KEYS);
    });

    it("sets `useDefaultViewerChannelSettings` to `false`", () => {
      useViewerState.getState().resetToDefaultViewerState();
      useViewerState.getState().resetToSavedViewerState();
      expect(useViewerState.getState().useDefaultViewerChannelSettings).toBe(false);
    });
  });
});
