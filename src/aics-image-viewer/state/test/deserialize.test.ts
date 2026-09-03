import { describe, expect, it } from "@jest/globals";

import {
  CONTROL_POINTS_REGEX,
  enumParser,
  LEGACY_CONTROL_POINTS_REGEX,
  parseHexColorAsColorArray,
  parseKeyValueList,
  stringSnapshotToChannelState,
  stringSnapshotToViewerChannelSetting,
  snapshotToViewerState,
  stringSnapshotToViewerState,
  validateInt,
  validateNumber,
} from "../deserialize";
import { viewerStateToSnapshot, viewerStateToStringSnapshot } from "../serialize";
import { RenderMode, type ViewerState, ViewMode } from "../types";
import {
  CUSTOM_TEST_VIEWER_STATE,
  DEFAULT_TEST_VIEWER_CHANNEL_SETTING,
  DEFAULT_TEST_VIEWER_STATE,
  STRINGIFIED_CUSTOM_TEST_VIEWER_STATE,
  STRINGIFIED_DEFAULT_TEST_VIEWER_STATE,
} from "./test_data";

//// VALUE PARSING ////////////////////////////////////////

describe("LEGACY_CONTROL_POINTS_REGEX", () => {
  it("accepts single control points", () => {
    const data = "1:0.5:ffffff";
    expect(LEGACY_CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });

  it("accepts multiple control points", () => {
    const data = "1:0.5:ff0000,128:0.7:ffff00,255:1:ff0000";
    expect(LEGACY_CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });

  it("accepts negative numbers", () => {
    const data = "-1:0.5:ff0000,-255:1:ff0000";
    expect(LEGACY_CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });

  it("allows 'w' as a placeholder for color strings", () => {
    const data = "1:0.5:1,255:1:1";
    expect(LEGACY_CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });
});

describe("CONTROL_POINTS_REGEX", () => {
  it("accepts single control points", () => {
    const data = "1:0.5:ffffff";
    expect(CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });

  it("accepts multiple control points", () => {
    const data = "1:0.5:ff0000:128:0.7:ffff00:255:1:ff0000";
    expect(CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });

  it("accepts negative numbers", () => {
    const data = "-1:0.5:ff0000:-255:1:ff0000";
    expect(CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });

  it("allows empty color strings", () => {
    const data = "1:0.5:1:255:1:1";
    expect(CONTROL_POINTS_REGEX.test(data)).toBe(true);
  });
});

describe("parseKeyValueList", () => {
  it("returns expected key value pairs", () => {
    const data = "key1:value1,key2:value2";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });

  it("decodes encoded key and value string names", () => {
    const data = "ampersand%26:ampersand%26,comma%2C:comma%2C,colon%3A:colon%3A";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ "ampersand&": "ampersand&", "comma,": "comma,", "colon:": "colon:" });
  });

  it("ignores repeat colons in value string", () => {
    const data = "key1:value1:extra:extra,key2:value2";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ key1: "value1:extra:extra", key2: "value2" });
  });

  it("returns empty object for empty string", () => {
    const data = "";
    const result = parseKeyValueList(data);
    expect(result).toEqual({});
  });

  it("parses example viewer channel settings", () => {
    const data = "col:FF0000,clz:1,cza:0.5,isa:0.75,ven:1,sen:1,isv:128,lut:autoij:";
    const result = parseKeyValueList(data);
    expect(result).toEqual({
      col: "FF0000",
      clz: "1",
      cza: "0.5",
      isa: "0.75",
      ven: "1",
      sen: "1",
      isv: "128",
      lut: "autoij:",
    });
  });

  it("removes trailing and leading whitespace", () => {
    const data = " key1 : value1 , key2 : value2 , key3: value 3";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ key1: "value1", key2: "value2", key3: "value 3" });
  });
});

describe("parseHexColorAsColorArray", () => {
  it("parses hex values", () => {
    expect(parseHexColorAsColorArray("000000")).toEqual([0, 0, 0]);
    expect(parseHexColorAsColorArray("FFFFFF")).toEqual([255, 255, 255]);
    expect(parseHexColorAsColorArray("ff0000")).toEqual([255, 0, 0]);
    expect(parseHexColorAsColorArray("123456")).toEqual([18, 52, 86]);
    expect(parseHexColorAsColorArray("7890ab")).toEqual([120, 144, 171]);
    expect(parseHexColorAsColorArray("cdefef")).toEqual([205, 239, 239]);
    expect(parseHexColorAsColorArray("ABCDEF")).toEqual([171, 205, 239]);
  });

  it("ignores unrecognized formats", () => {
    expect(parseHexColorAsColorArray("f")).toBeUndefined();
    expect(parseHexColorAsColorArray("fff")).toBeUndefined();
    expect(parseHexColorAsColorArray("fffffff")).toBeUndefined();
    expect(parseHexColorAsColorArray("hjklmn")).toBeUndefined();
  });

  it("parses the '1' code as white", () => {
    expect(parseHexColorAsColorArray("1")).toEqual([255, 255, 255]);
  });
});

describe("enumParser", () => {
  enum TestEnum {
    SOME_VALUE = "someValue",
    ANOTHER_VALUE = "anotherValue",
  }
  const parseTestEnum = enumParser(TestEnum);

  it("recognizes enum values", () => {
    expect(parseTestEnum("someValue")).toEqual(TestEnum.SOME_VALUE);
    expect(parseTestEnum("anotherValue")).toEqual(TestEnum.ANOTHER_VALUE);
  });

  it("recognizes lowercase enum values", () => {
    expect(parseTestEnum("somevalue")).toEqual(TestEnum.SOME_VALUE);
    expect(parseTestEnum("anothervalue")).toEqual(TestEnum.ANOTHER_VALUE);
  });
});

describe("validateInt", () => {
  it("returns undefined for undefined and NaN values", () => {
    expect(validateInt("bad", -1000, 1000)).toEqual(undefined);
    expect(validateInt(NaN, -1000, 1000)).toEqual(undefined);
    expect(validateInt(undefined, -1000, 1000)).toEqual(undefined);
  });

  it("casts float values to integers", () => {
    expect(validateInt(0.5, 0, 1000)).toEqual(0);
    expect(validateInt(99.5, 0, 1000)).toEqual(99);
    expect(validateInt(-10.5, -1000, 1000)).toEqual(-10);
  });

  it("applies clamping", () => {
    expect(validateInt(0, 0, 255)).toEqual(0);
    expect(validateInt(-1, 0, 255)).toEqual(0);
    expect(validateInt(128, 0, 255)).toEqual(128);
    expect(validateInt(255, 0, 255)).toEqual(255);
    expect(validateInt(256, 0, 255)).toEqual(255);
  });
});

describe("validateNumber", () => {
  it("returns undefined for NaN or undefined values", () => {
    expect(validateNumber("bad", -1000, 1000)).toEqual(undefined);
    expect(validateNumber(NaN, -1000, 1000)).toEqual(undefined);
    expect(validateNumber(undefined, -1000, 1000)).toEqual(undefined);
  });

  it("applies clamping", () => {
    expect(validateNumber(0.5, 0, 1.0)).toEqual(0.5);
    expect(validateNumber(1.0, 0, 1.0)).toEqual(1.0);
    expect(validateNumber(1.1, 0, 1.0)).toEqual(1.0);
    expect(validateNumber(0, 0, 1.0)).toEqual(0);
    expect(validateNumber(-0.1, 0, 1.0)).toEqual(0);
  });
});

//// DESERIALIZE STATE ////////////////////////////////////

// Note that the serialization + deserialization are NOT direct inverses.
// Serializing converts a ChannelState object to a ViewerChannelSettingParams object,
// deserializing converts a ViewerChannelSettingParams object to a **ViewerChannelSetting** object.

//  ChannelStates are per-channel and are used internally, while ViewerChannelSettings are
// input into the viewer and support grouping/matching to multiple channels.
// TODO: refactor these to all be the same state?

describe("stringSnapshotToViewerChannelSetting", () => {
  it("returns default settings for empty objects", () => {
    const data = {};
    const result = stringSnapshotToViewerChannelSetting(0, data);
    expect(result).toEqual(DEFAULT_TEST_VIEWER_CHANNEL_SETTING);
  });

  it("ignores unexpected keys", () => {
    const data = { badKey: "badValue", ven: "1", sen: "1" } as const;
    const result = stringSnapshotToViewerChannelSetting(0, data);
    expect(result).toEqual({ ...DEFAULT_TEST_VIEWER_CHANNEL_SETTING, enabled: true, surfaceEnabled: true });
  });

  it("parses settings correctly", () => {
    const data = {
      col: "FF0000",
      clz: "1",
      cza: "0.5",
      isa: "0.75",
      ven: "1",
      sen: "1",
      isv: "128",
      lut: "0:255",
    } as const;
    expect(stringSnapshotToViewerChannelSetting(0, data)).toEqual({
      match: 0,
      color: "FF0000",
      enabled: true,
      surfaceEnabled: true,
      isovalue: 128,
      surfaceOpacity: 0.75,
      colorizeEnabled: true,
      colorizeAlpha: 0.5,
      intensity: { lut: ["0", "255"] },
    });
  });

  it("handles expected lut formatting", () => {
    const luts = [
      ["autoij:0", ["autoij", "0"]],
      ["0:autoij", ["0", "autoij"]],
      [":autoij", ["", "autoij"]],
      ["autoij:", ["autoij", ""]],
      ["0:255", ["0", "255"]],
      ["0.5:1.0", ["0.5", "1.0"]],
      ["0.50:1.00", ["0.50", "1.00"]],
      ["m99:m100", ["m99", "m100"]],
      ["p10:p90", ["p10", "p90"]],
      ["p10: p90", ["p10", "p90"]], // handle spaces
    ] as const;
    for (const [encodedLut, decodedLut] of luts) {
      const data = { lut: encodedLut } as const;
      const result = stringSnapshotToViewerChannelSetting(0, data);
      expect(result.intensity?.lut).toEqual(decodedLut);
    }
  });

  it("ignores unexpected lut formats", () => {
    const luts = ["!:0", "0:9:93", "255", ""];
    for (const lut of luts) {
      const data = { lut } as const;
      const result = stringSnapshotToViewerChannelSetting(0, data);
      expect(result.lut).toBeUndefined();
    }
  });

  it("handles hex color formats", () => {
    const colors = ["000000", "FFFFFF", "ffffff", "012345", "6789AB", "CDEF01", "abcdef"];
    for (const color of colors) {
      const data = { col: color } as const;
      const result = stringSnapshotToViewerChannelSetting(0, data);
      expect(result.color).toEqual(color);
    }
  });

  it("ignores bad color formats", () => {
    const badColors = ["f", "ff00", "red", "rgb(255,0,0)"];
    for (const color of badColors) {
      const data = { col: color } as const;
      const result = stringSnapshotToViewerChannelSetting(0, data);
      expect(result.color).toBeUndefined();
    }
  });

  it("ignores bad float data", () => {
    const data = { cza: "NaN", isa: "bad", isv: "f8" } as const;
    const result = stringSnapshotToViewerChannelSetting(0, data);
    expect(result.colorizeAlpha).toBeUndefined();
    expect(result.surfaceOpacity).toBeUndefined();
    expect(result.isovalue).toBeUndefined();
  });
});

describe("stringSnapshotToChannelState", () => {
  it("returns an empty object for empty input", () => {
    expect(stringSnapshotToChannelState({})).toEqual({});
  });

  it("parses channel state fields", () => {
    const data = {
      col: "ff0000",
      clz: "1",
      cza: "0.5",
      isa: "0.75",
      ven: "1",
      sen: "1",
      isv: "128",
      ram: "0:255",
      cpe: "1",
      pin: "1",
    } as const;

    expect(stringSnapshotToChannelState(data)).toEqual({
      color: [255, 0, 0],
      colorizeEnabled: true,
      colorizeAlpha: 0.5,
      opacity: 0.75,
      volumeEnabled: true,
      isosurfaceEnabled: true,
      isovalue: 128,
      ramp: [0, 255],
      useControlPoints: true,
      keepIntensityRange: true,
    });
  });

  it("prefers new control points and ramp fields over legacy fields", () => {
    const data = {
      cpt: "0:0:000000:255:1:ffffff",
      cps: "0:0:ff0000:255:1:00ff00",
      ram: "1:2",
      rmp: "3:4",
    } as const;

    expect(stringSnapshotToChannelState(data)).toEqual({
      controlPoints: [
        { x: 0, opacity: 0, color: [0, 0, 0] },
        { x: 255, opacity: 1, color: [255, 255, 255] },
      ],
      ramp: [1, 2],
    });
  });
});

describe("stringSnapshotToViewerState", () => {
  it("returns an empty object for empty input", () => {
    expect(stringSnapshotToViewerState({})).toEqual({});
  });

  it("deserializes the default viewer settings", () => {
    const params = STRINGIFIED_DEFAULT_TEST_VIEWER_STATE;
    expect(stringSnapshotToViewerState(params)).toEqual(DEFAULT_TEST_VIEWER_STATE);
  });

  it("deserializes custom viewer settings", () => {
    const params = STRINGIFIED_CUSTOM_TEST_VIEWER_STATE;
    expect(stringSnapshotToViewerState(params)).toEqual(CUSTOM_TEST_VIEWER_STATE);
  });

  it("handles all ViewMode values", () => {
    const viewModes = Object.values(ViewMode);
    for (const viewMode of viewModes) {
      const state: ViewerState = { ...DEFAULT_TEST_VIEWER_STATE, viewMode };
      expect(stringSnapshotToViewerState(viewerStateToStringSnapshot(state, false)).viewMode).toEqual(viewMode);
    }
  });

  it("handles all RenderMode values", () => {
    const renderModes = Object.values(RenderMode);
    for (const renderMode of renderModes) {
      const state: ViewerState = { ...DEFAULT_TEST_VIEWER_STATE, renderMode };
      expect(stringSnapshotToViewerState(viewerStateToStringSnapshot(state, false)).renderMode).toEqual(renderMode);
    }
  });

  it("deserializes partial camera settings", () => {
    const state: Partial<ViewerState> = {
      cameraState: {
        position: [1.0, -1.4, 45],
        up: [0, 1, 0],
        fov: 43.5,
      },
    };
    const serializedState = "pos:1:-1.4:45,up:0:1:0,fov:43.5";
    expect(stringSnapshotToViewerState({ cam: serializedState })).toEqual(state);
  });
});

const DEFAULT_CONTROL_POINTS = [
  { x: -10, opacity: 0, color: [0, 0, 0] },
  { x: 50, opacity: 0, color: [0, 0, 0] },
  { x: 100, opacity: 0.3, color: [0, 16, 255] },
  { x: 140, opacity: 0.8, color: [0, 255, 255] },
  { x: 260, opacity: 1, color: [0, 255, 180] },
];

describe("legacy control points", () => {
  it("parses comma-separated control points", () => {
    const result = stringSnapshotToViewerChannelSetting(0, {
      cps: "-10:0:000000,50:0:000000,100:0.3:0010ff,140:0.8:00ffff,260:1:00ffb4",
    });
    expect(result.controlPoints).toEqual(DEFAULT_CONTROL_POINTS);
  });

  it("parses colon-separated control points", () => {
    const result = stringSnapshotToViewerChannelSetting(0, {
      cps: "-10:0:000000:50:0:000000:100:0.3:0010ff:140:0.8:00ffff:260:1:00ffb4",
    });
    expect(result.controlPoints).toEqual(DEFAULT_CONTROL_POINTS);
  });

  it("replaces '1' color strings with default color #ffffff", () => {
    const result = stringSnapshotToViewerChannelSetting(0, {
      cps: "0:0:1:50:1:1",
    });
    expect(result.controlPoints).toEqual([
      { x: 0, opacity: 0, color: [255, 255, 255] },
      { x: 50, opacity: 1, color: [255, 255, 255] },
    ]);
  });
});

it("parses comma-separated control points", () => {
  const result = stringSnapshotToViewerChannelSetting(0, {
    cpt: "-10:0:000000,50:0:000000,100:0.3:0010ff,140:0.8:00ffff,260:1:00ffb4",
  });
  expect(result.intensity?.controlPoints).toEqual(DEFAULT_CONTROL_POINTS);
});

it("parses colon-separated control points", () => {
  const result = stringSnapshotToViewerChannelSetting(0, {
    cpt: "-10:0:000000:50:0:000000:100:0.3:0010ff:140:0.8:00ffff:260:1:00ffb4",
  });
  expect(result.intensity?.controlPoints).toEqual(DEFAULT_CONTROL_POINTS);
});

it("replaces '1' color strings with default color #ffffff", () => {
  const result = stringSnapshotToViewerChannelSetting(0, {
    cpt: "0:0:1:50:1:1",
  });
  expect(result.intensity?.controlPoints).toEqual([
    { x: 0, opacity: 0, color: [255, 255, 255] },
    { x: 50, opacity: 1, color: [255, 255, 255] },
  ]);
});

describe("triple projection slice indices", () => {
  // All three panes are independently sliceable in triple projection mode, so unlike the single-axis 2D modes
  // every axis of `slice` carries user-visible state and must survive a round trip on every transport.
  const TRIPLE_PROJ_STATE: ViewerState = {
    ...DEFAULT_TEST_VIEWER_STATE,
    viewMode: ViewMode.tripleProj,
    slice: { x: 0.125, y: 0.375, z: 0.875 },
  };

  it("round-trips through url query strings", () => {
    // `removeDefaults` is true here to match what the share button does
    const stringified = viewerStateToStringSnapshot(TRIPLE_PROJ_STATE, true);
    expect(stringified.slice).toEqual("0.125,0.375,0.875");

    const parsed = stringSnapshotToViewerState(stringified);
    expect(parsed.viewMode).toEqual(ViewMode.tripleProj);
    expect(parsed.slice).toEqual(TRIPLE_PROJ_STATE.slice);
  });

  it("round-trips through snapshots, as used by import/export and copy/paste", () => {
    const snapshot = viewerStateToSnapshot(TRIPLE_PROJ_STATE, false);
    expect(snapshot.slice).toEqual([0.125, 0.375, 0.875]);

    const parsed = snapshotToViewerState(snapshot);
    expect(parsed.viewMode).toEqual(ViewMode.tripleProj);
    expect(parsed.slice).toEqual(TRIPLE_PROJ_STATE.slice);
  });

  it("keeps every axis when only one slider has moved from its default", () => {
    // `removeMatchingProperties` compares `slice` as a whole, so a single moved slider must not
    // drop the two axes that still happen to sit at their defaults.
    const state: ViewerState = { ...TRIPLE_PROJ_STATE, slice: { x: 0.25, y: 0.5, z: 0.5 } };
    const parsed = stringSnapshotToViewerState(viewerStateToStringSnapshot(state, true));
    expect(parsed.slice).toEqual({ x: 0.25, y: 0.5, z: 0.5 });
  });

  it("omits slice entirely when no slider has moved", () => {
    const stringified = viewerStateToStringSnapshot({ ...TRIPLE_PROJ_STATE, slice: { x: 0.5, y: 0.5, z: 0.5 } }, true);
    expect(stringified.slice).toBeUndefined();
  });
});
