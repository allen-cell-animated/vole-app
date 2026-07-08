import { describe, expect, it } from "@jest/globals";

import { parseKeyValueList } from "../../../state/deserialize";
import { DEFAULT_VIEWER_CHANNEL_SETTING } from "../../../state/test/test_data";
import type { ChannelState, ViewerChannelStateParams, ViewerState } from "../../../state/types";
import { getDefaultChannelState, getDefaultViewerState } from "../../constants";
import { ViewMode } from "../../enums";
import { parseViewerUrlParams, serializeViewerUrlParams } from "../parseUrl";
import type { ViewerChannelSetting } from "../viewerChannelSettings";

//// URL parsing /////////////////////////////////

describe("parseViewerUrlParams", () => {
  // Tests will try parsing both unencoded and encoded URL params.
  const channelParamToSetting: [string, string, Partial<ViewerChannelSetting>][] = [
    [
      "c3=ven:1,col:ff00ff,clz:0,cza:0.9,isa:0.4,lut:p50:p99,sen:1,isv:129",
      "c3=ven%3A1%2Ccol%3Aff00ff%2Cclz%3A0%2Ccza%3A0.9%2Cisa%3A0.4%2Clut%3Ap50%3Ap99%2Csen%3A1%2Cisv%3A129",
      {
        color: "ff00ff",
        name: undefined,
        match: 3,
        enabled: true,
        surfaceEnabled: true,
        surfaceOpacity: 0.4,
        colorizeEnabled: false,
        colorizeAlpha: 0.9,
        isovalue: 129,
        intensity: {
          lut: ["p50", "p99"],
        },
      },
    ],
    [
      "c1=ven:0,col:ff0000,clz:1,cza:0.5,isa:0.75,lut:0:255,sen:0,isv:0",
      "c1=ven%3A0%2Ccol%3Aff0000%2Cclz%3A1%2Ccza%3A0.5%2Cisa%3A0.75%2Clut%3A0%3A255%2Csen%3A0%2Cisv%3A0",
      {
        color: "ff0000",
        name: undefined,
        match: 1,
        colorizeEnabled: true,
        colorizeAlpha: 0.5,
        surfaceOpacity: 0.75,
        surfaceEnabled: false,
        enabled: false,
        isovalue: 0,
        intensity: {
          lut: ["0", "255"],
        },
      },
    ],
    [
      "c5=ven:0,col:00ff00,clz:0,cza:0,isa:1,lut:autoij:,sen:1,isv:100",
      "c5=ven%3A0%2Ccol%3A00ff00%2Cclz%3A0%2Ccza%3A0%2Cisa%3A1%2Clut%3Aautoij%3A%2Csen%3A1%2Cisv%3A100",
      {
        color: "00ff00",
        name: undefined,
        match: 5,
        colorizeEnabled: false,
        colorizeAlpha: 0,
        surfaceOpacity: 1,
        surfaceEnabled: true,
        enabled: false,
        isovalue: 100,
        intensity: {
          lut: ["autoij", ""],
        },
      },
    ],
  ];

  it("parses unencoded per-channel setting", async () => {
    for (const [queryString, , expected] of channelParamToSetting) {
      const { args } = await parseViewerUrlParams(queryString);
      const channelSetting = args.viewerChannelSettings?.groups[0].channels[0]!;
      expect(channelSetting).toEqual(expected);
    }
  });

  it("parses encoded per-channel settings", async () => {
    for (const [, queryString, expected] of channelParamToSetting) {
      const { args } = await parseViewerUrlParams(queryString);
      const channelSetting = args.viewerChannelSettings?.groups[0].channels[0]!;
      expect(channelSetting).toEqual(expected);
    }
  });

  it("parses multiple per-channel settings", async () => {
    // Test unencoded (i=0) and encoded (i=1)
    for (let i = 0; i < 2; i++) {
      const queryString =
        channelParamToSetting[0][i] + "&" + channelParamToSetting[1][i] + "&" + channelParamToSetting[2][i];
      const { args } = await parseViewerUrlParams(queryString);
      const channelSettings = args.viewerChannelSettings?.groups[0].channels!;

      // Order is not guaranteed, so check if any of the expected settings are present
      expect(channelSettings).toContainEqual(channelParamToSetting[0][2]);
      expect(channelSettings).toContainEqual(channelParamToSetting[1][2]);
      expect(channelSettings).toContainEqual(channelParamToSetting[2][2]);
    }
  });

  it("overrides ch settings when per-channel settings are included", async () => {
    const queryString = "?ch=0&lut=1,2&c1=ven:1,lut:4:5";
    const { args } = await parseViewerUrlParams(queryString);

    const groups = args.viewerChannelSettings?.groups[0]!;
    expect(groups.channels).toHaveLength(1);
    const channelSetting = groups.channels[0];

    expect(channelSetting.match).toEqual(1);
    expect(channelSetting.enabled).toEqual(true);
    expect(channelSetting.intensity?.lut).toEqual(["4", "5"]);
  });

  it("skips missing channel indices", async () => {
    const queryString = "?c0=ven:1&c15=ven:1,lut:4:5";
    const { args } = await parseViewerUrlParams(queryString);

    const groups = args.viewerChannelSettings?.groups[0]!;
    expect(groups.channels).toHaveLength(2);
    const channelSetting1 = groups.channels[0];
    const channelSetting2 = groups.channels[1];

    expect(channelSetting1.match).toEqual(0);
    expect(channelSetting1.enabled).toEqual(true);

    expect(channelSetting2.match).toEqual(15);
    expect(channelSetting2.enabled).toEqual(true);
    expect(channelSetting2.intensity?.lut).toEqual(["4", "5"]);
  });

  it("creates empty default data for bad per-channel setting formats", async () => {
    const queryString = "c1=bad&c0=ultrabad:bad&c2=,,,,,,";
    const { args } = await parseViewerUrlParams(queryString);
    const channelSettings = args.viewerChannelSettings?.groups[0].channels!;
    expect(channelSettings).toHaveLength(3);
    for (let i = 0; i < channelSettings.length; i++) {
      const channelSetting = channelSettings[i];
      // Match with default on everything except match number
      expect(channelSetting).toEqual({ ...DEFAULT_VIEWER_CHANNEL_SETTING, match: channelSetting.match });
    }
  });

  it("enables first three channels by default if no channel settings are provided", async () => {
    const queryString = "url=https://example.com/image.tiff";
    const { args } = await parseViewerUrlParams(queryString);

    // Should have one group
    const channelSettingsGroups = args.viewerChannelSettings?.groups!;
    expect(channelSettingsGroups).toHaveLength(1);
    const channelSettings = channelSettingsGroups[0].channels;
    expect(channelSettings[0]).toEqual({ match: [0, 1, 2], enabled: true });
    expect(channelSettings[1]).toEqual({ match: "(.+)", enabled: false });
  });

  it("parses default nucmorph settings", async () => {
    const queryString =
      "url=https://example.com/image1.ome.zarr,https://example.com/image2.ome.zarr&c0=ven:0&c1=ven:1,lut:autoij:&c2=ven:1,clz:1&view=Z";
    const { args, viewerSettings } = await parseViewerUrlParams(queryString);

    expect(viewerSettings.viewMode).toEqual(ViewMode.xy);
    expect(args.imageUrl).toEqual({
      scenes: [["https://example.com/image1.ome.zarr", "https://example.com/image2.ome.zarr"]],
    });

    // Check that channel settings have been loaded in.
    // Should be one group with three channels.
    let channelSettings = args.viewerChannelSettings?.groups[0];
    expect(channelSettings).toBeDefined();
    channelSettings = channelSettings!;

    expect(channelSettings.channels).toHaveLength(3);
    expect(channelSettings.channels[0].match).toEqual(0);
    expect(channelSettings.channels[0].enabled).toEqual(false);
    expect(channelSettings.channels[1].match).toEqual(1);
    expect(channelSettings.channels[1].enabled).toEqual(true);
    expect(channelSettings.channels[1].intensity?.lut).toEqual(["autoij", ""]);
    expect(channelSettings.channels[2].match).toEqual(2);
    expect(channelSettings.channels[2].enabled).toEqual(true);
    expect(channelSettings.channels[2].colorizeEnabled).toEqual(true);
  });

  it("can handle arbitrary levels of URL encoding", async () => {
    // GOAL: no matter how, where, or how many times URL encoding is applied when concatenating
    // these scene URLs into one param, they should decode back to the same URLs.
    const scenes = [
      ["https://example.com/image1.ome.zarr"],
      ["https://example.com/image2.ome.zarr", "https://example.com/image3.ome.zarr?foo=1%2C2%2C3"],
    ];

    // Recursively generate combinations of encoded and unencoded URLs
    interface NestedArray<T> extends Array<T | NestedArray<T>> {}
    const allEncodingCombinations = (urls: string | NestedArray<string>, delims: string[]): string[] => {
      // BASE CASE: generate an unencoded and encoded variant of a single URL
      if (typeof urls === "string") {
        return [urls, encodeURIComponent(urls)];
      }

      // Recursively generate combinations for all array elements
      const nextDelims = delims.slice(1);
      const encoded = urls.map((url) => allEncodingCombinations(url, nextDelims));

      // Concatenate those together in all possible combinations
      const combined = encoded.reduce((accum, next) => {
        const result = [];
        for (const a of accum) {
          for (const n of next) {
            result.push(a + delims[0] + n);
          }
        }
        return result;
      });

      // Generate unencoded, encoded, and double-encoded variants of all those concatenated strings
      return combined.flatMap((url) => {
        const encodedOnce = encodeURIComponent(url);
        return [url, encodedOnce, encodeURIComponent(encodedOnce)];
      });
    };

    const encodings = allEncodingCombinations(scenes, ["+", ","]);

    for (const encoding of encodings) {
      const { args } = await parseViewerUrlParams(`url=${encoding}`);
      expect(args.imageUrl).toEqual({ scenes });
    }
  });

  it("parses viewer settings", async () => {
    const queryString = "mask=30&view=X";
    const { viewerSettings } = await parseViewerUrlParams(queryString);
    expect(viewerSettings.viewMode).toEqual(ViewMode.yz);
    expect(viewerSettings.maskAlpha).toEqual(30);
  });

  it("returns an empty object when no params are passed in", async () => {
    const queryString = "";
    const { args, viewerSettings } = await parseViewerUrlParams(queryString);
    expect(Object.keys(args).length === 0);
    expect(args).toEqual({});
    expect(Object.keys(viewerSettings).length === 0);
    expect(viewerSettings).toEqual({});
  });
});

describe("serializeViewerUrlParams", () => {
  it("serializes channel settings to key-value list format", () => {
    const channelStates: ChannelState[] = [
      {
        name: "channel0",
        displayName: "channel0",
        color: [255, 0, 0],
        volumeEnabled: true,
        isosurfaceEnabled: true,
        isovalue: 128,
        opacity: 0.75,
        colorizeEnabled: true,
        colorizeAlpha: 0.5,
        useControlPoints: false,
        controlPoints: [
          { x: 0, opacity: 0, color: [128, 128, 128] },
          { x: 1, opacity: 1, color: [255, 0, 0] },
        ],
        ramp: [-10, 260.1],
        plotMin: 0,
        plotMax: 255,
        keepIntensityRange: true,
      },
      {
        name: "channel1",
        displayName: "channel1",
        color: [128, 128, 128],
        volumeEnabled: false,
        isosurfaceEnabled: false,
        isovalue: 57,
        opacity: 0.0,
        colorizeEnabled: false,
        colorizeAlpha: 0.2,
        useControlPoints: true,
        controlPoints: [
          { x: -10, opacity: 0, color: [0, 0, 0] },
          { x: 50, opacity: 0, color: [0, 0, 0] },
          { x: 100, opacity: 0.3, color: [0, 16, 255] },
          { x: 140, opacity: 0.8, color: [0, 255, 255] },
          { x: 260, opacity: 1.0, color: [0, 255, 180] },
        ],
        ramp: [50, 140],
        plotMin: 0,
        plotMax: 255,
        keepIntensityRange: false,
      },
    ];
    const serialized = serializeViewerUrlParams({ channelSettings: channelStates }, false);
    // Format should look like "ven:1,col:ff0000,clz:1,cza:0.75,isa:0.5,sen:1,isv:128", but ordering
    // is not guaranteed. Parse the string and check that the values match the expected values.
    // Note that `lut` is not included when serializing from existing viewer state.
    const expectedChannel0: Required<Omit<ViewerChannelStateParams, "lut" | "rmp" | "cps">> = {
      ven: "1",
      col: "ff0000",
      clz: "1",
      cza: "0.5",
      isa: "0.75",
      sen: "1",
      isv: "128",
      ram: "-10:260.1",
      cpt: "0:0:808080:1:1:ff0000",
      cpe: "0",
      pin: "1",
    };
    const expectedChannel1: Required<Omit<ViewerChannelStateParams, "lut" | "rmp" | "cps">> = {
      ven: "0",
      col: "808080",
      clz: "0",
      cza: "0.2",
      isa: "0",
      sen: "0",
      isv: "57",
      ram: "50:140",
      cpt: "-10:0:000000:50:0:000000:100:0.3:0010ff:140:0.8:00ffff:260:1:00ffb4",
      cpe: "1",
      pin: "0",
    };

    expect(serialized["c0"]).toBeDefined();
    expect(parseKeyValueList(serialized["c0"]!)).toEqual(expectedChannel0);
    expect(serialized["c1"]).toBeDefined();
    expect(parseKeyValueList(serialized["c1"]!)).toEqual(expectedChannel1);
  });

  it("can remove viewer settings that match the default", () => {
    const defaultViewerSettings = getDefaultViewerState();
    const customViewerState: Partial<ViewerState> = {
      viewMode: ViewMode.xy,
      density: 100,
      time: 40,
      cameraState: {
        position: [1.2, 3.4, 5.6],
        target: defaultViewerSettings.cameraState?.target,
        up: defaultViewerSettings.cameraState?.up,
      },
    };

    const serializedParams = serializeViewerUrlParams(
      { ...defaultViewerSettings, ...customViewerState },
      true
    ) as Record<string, string>;
    const urlParams = new URLSearchParams(serializedParams);
    // Pos is 1.2:3.4:5.6 but escaped
    const expectedCameraPosition = encodeURIComponent("pos:1.2:3.4:5.6");
    expect(urlParams.toString()).toEqual(`dens=100&t=40&cam=${expectedCameraPosition}&view=Z`);
  });

  it("can remove channel state fields that matches the default", () => {
    // Note that this unit test will break if the
    const customChannelState: Partial<ChannelState> = {
      color: [255, 0, 0],
      useControlPoints: true,
      isovalue: 49,
    };
    const serializedParams = serializeViewerUrlParams(
      { ...getDefaultViewerState(), channelSettings: [{ ...getDefaultChannelState(), ...customChannelState }] },
      true
    ) as Record<string, string>;
    const urlParams = new URLSearchParams(serializedParams);

    const expectedEncodedParams = encodeURIComponent("isv:49,col:ff0000,cpe:1");
    expect(urlParams.toString()).toEqual("c0=" + expectedEncodedParams);
  });

  it("does not use object reference comparison on control points when excluding defaults", () => {
    // Expand control points so it isn't comparing an object reference
    const defaultChannelState = getDefaultChannelState();
    const customChannelState: Partial<ChannelState> = {
      controlPoints: [{ ...defaultChannelState.controlPoints[0] }, { ...defaultChannelState.controlPoints[1] }],
    };

    const serializedParams = serializeViewerUrlParams(
      { ...getDefaultViewerState(), channelSettings: [{ ...defaultChannelState, ...customChannelState }] },
      true
    ) as Record<string, string>;
    const urlParams = new URLSearchParams(serializedParams);
    expect(urlParams.toString()).toEqual("c0=");
  });
});
