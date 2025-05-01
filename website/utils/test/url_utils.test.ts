import { CameraState } from "@aics/vole-core";
import { describe, expect, it } from "@jest/globals";

import { ChannelState, ViewerState } from "../../../src/aics-image-viewer/components/ViewerStateProvider/types";
import {
  getDefaultCameraState,
  getDefaultChannelState,
  getDefaultViewerState,
} from "../../../src/aics-image-viewer/shared/constants";
import { ImageType, RenderMode, ViewMode } from "../../../src/aics-image-viewer/shared/enums";
import { ViewerChannelSetting } from "../../../src/aics-image-viewer/shared/utils/viewerChannelSettings";
import {
  CONTROL_POINTS_REGEX,
  deserializeViewerChannelSetting,
  deserializeViewerState,
  LEGACY_CONTROL_POINTS_REGEX,
  parseHexColorAsColorArray,
  parseKeyValueList,
  parseStringEnum,
  parseStringFloat,
  parseStringInt,
  parseViewerUrlParams,
  serializeCameraState,
  serializeViewerChannelSetting,
  serializeViewerState,
  serializeViewerUrlParams,
  ViewerChannelSettingParams,
  ViewerStateParams,
} from "../url_utils";

const defaultSettings: ViewerChannelSetting = {
  match: 0,
  color: undefined,
  enabled: undefined,
  surfaceEnabled: undefined,
  isovalue: undefined,
  surfaceOpacity: undefined,
  colorizeEnabled: undefined,
  colorizeAlpha: undefined,
};

//// VALUE PARSING ///////////////////////////////////////

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

describe("parseStringEnum", () => {
  enum TestEnum {
    SOME_VALUE = "some_value",
    ANOTHER_VALUE = "another_value",
  }

  it("recognizes enum values", () => {
    expect(parseStringEnum("some_value", TestEnum)).toEqual(TestEnum.SOME_VALUE);
    expect(parseStringEnum("another_value", TestEnum)).toEqual(TestEnum.ANOTHER_VALUE);
  });

  it("returns default values for unrecognized enum values", () => {
    expect(parseStringEnum("unexpected", TestEnum, undefined)).toEqual(undefined);
    expect(parseStringEnum("unexpected", TestEnum, TestEnum.SOME_VALUE)).toEqual(TestEnum.SOME_VALUE);
  });
});

describe("parseStringInt", () => {
  it("parses int and undefined values", () => {
    expect(parseStringInt("0", 0, 1000)).toEqual(0);
    expect(parseStringInt("1", 0, 1000)).toEqual(1);
    expect(parseStringInt("100", 0, 1000)).toEqual(100);
    expect(parseStringInt("255", 0, 1000)).toEqual(255);
    expect(parseStringInt("-1", -1000, 1000)).toEqual(-1);
  });

  it("returns undefined for undefined and NaN values", () => {
    expect(parseStringInt("bad", -1000, 1000)).toEqual(undefined);
    expect(parseStringInt("NaN", -1000, 1000)).toEqual(undefined);
    expect(parseStringInt(undefined, -1000, 1000)).toEqual(undefined);
  });

  it("casts float values to integers", () => {
    expect(parseStringInt("0.5", 0, 1000)).toEqual(0);
    expect(parseStringInt("99.5", 0, 1000)).toEqual(99);
    expect(parseStringInt("-10.5", -1000, 1000)).toEqual(-10);
  });

  it("applies clamping", () => {
    expect(parseStringInt("0", 0, 255)).toEqual(0);
    expect(parseStringInt("-1", 0, 255)).toEqual(0);
    expect(parseStringInt("128", 0, 255)).toEqual(128);
    expect(parseStringInt("255", 0, 255)).toEqual(255);
    expect(parseStringInt("256", 0, 255)).toEqual(255);
  });
});

describe("parseStringFloat", () => {
  it("parses strings to float values", () => {
    expect(parseStringFloat("0", -1000, 1000)).toEqual(0);
    expect(parseStringFloat("1.0", -1000, 1000)).toEqual(1.0);
    expect(parseStringFloat("0.5", -1000, 1000)).toEqual(0.5);
    expect(parseStringFloat("128.5", -1000, 1000)).toEqual(128.5);
    expect(parseStringFloat("495.344", -1000, 1000)).toEqual(495.344);
    expect(parseStringFloat("-1", -1000, 1000)).toEqual(-1);
  });

  it("returns undefined for NaN or undefined values", () => {
    expect(parseStringFloat("bad", -1000, 1000)).toEqual(undefined);
    expect(parseStringFloat("NaN", -1000, 1000)).toEqual(undefined);
    expect(parseStringFloat(undefined, -1000, 1000)).toEqual(undefined);
  });

  it("applies clamping", () => {
    expect(parseStringFloat("0.5", 0, 1.0)).toEqual(0.5);
    expect(parseStringFloat("1.0", 0, 1.0)).toEqual(1.0);
    expect(parseStringFloat("1.1", 0, 1.0)).toEqual(1.0);
    expect(parseStringFloat("0", 0, 1.0)).toEqual(0);
    expect(parseStringFloat("-0.1", 0, 1.0)).toEqual(0);
  });
});

//// SERIALIZE STATES ///////////////////////

describe("Channel state serialization", () => {
  const DEFAULT_CHANNEL_STATE: ChannelState = {
    name: "",
    displayName: "",
    color: [255, 0, 0],
    volumeEnabled: true,
    isosurfaceEnabled: true,
    isovalue: 128,
    opacity: 0.75,
    colorizeEnabled: true,
    colorizeAlpha: 0.5,
    useControlPoints: false,
    controlPoints: [
      { x: 0, opacity: 0.5, color: [255, 255, 255] },
      { x: 255, opacity: 1.0, color: [255, 255, 255] },
    ],
    ramp: [0, 255],
    lockPlotToDataRange: true,
    plotMax: 255,
  };
  const DEFAULT_SERIALIZED_CHANNEL_STATE: ViewerChannelSettingParams = {
    col: "ff0000",
    ven: "1",
    sen: "1",
    isv: "128",
    isa: "0.75",
    clz: "1",
    cza: "0.5",
    cpe: "0",
    cps: "0:0.5:1:255:1:1",
    rmp: "0:255",
  };

  // Note that the serialization + deserialization are NOT direct inverses.
  // Serializing converts a ChannelState object to a ViewerChannelSettingParams object,
  // deserializing converts a ViewerChannelSettingParams object to a **ViewerChannelSetting** object.

  //  ChannelStates are per-channel and are used internally, while ViewerChannelSettings are
  // input into the viewer and support grouping/matching to multiple channels.
  // TODO: refactor these to all be the same state?

  describe("deserializeViewerChannelSetting", () => {
    it("returns default settings for empty objects", () => {
      const data = {};
      const result = deserializeViewerChannelSetting(0, data);
      expect(result).toEqual(defaultSettings);
    });

    it("ignores unexpected keys", () => {
      const data = { badKey: "badValue", ven: "1", sen: "1" } as ViewerChannelSettingParams;
      const result = deserializeViewerChannelSetting(0, data);
      expect(result).toEqual({ ...defaultSettings, enabled: true, surfaceEnabled: true });
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
      } as ViewerChannelSettingParams;
      expect(deserializeViewerChannelSetting(0, data)).toEqual({
        match: 0,
        color: "FF0000",
        enabled: true,
        surfaceEnabled: true,
        isovalue: 128,
        surfaceOpacity: 0.75,
        colorizeEnabled: true,
        colorizeAlpha: 0.5,
        lut: ["0", "255"],
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
      ];
      for (const [encodedLut, decodedLut] of luts) {
        const data = { lut: encodedLut } as ViewerChannelSettingParams;
        const result = deserializeViewerChannelSetting(0, data);
        expect(result.lut).toEqual(decodedLut);
      }
    });

    it("ignores unexpected lut formats", () => {
      const luts = ["!:0", "0:9:93", "255", ""];
      for (const lut of luts) {
        const data = { lut } as ViewerChannelSettingParams;
        const result = deserializeViewerChannelSetting(0, data);
        expect(result.lut).toBeUndefined();
      }
    });

    it("handles hex color formats", () => {
      const colors = ["000000", "FFFFFF", "ffffff", "012345", "6789AB", "CDEF01", "abcdef"];
      for (const color of colors) {
        const data = { col: color } as ViewerChannelSettingParams;
        const result = deserializeViewerChannelSetting(0, data);
        expect(result.color).toEqual(color);
      }
    });

    it("ignores bad color formats", () => {
      const badColors = ["f", "ff00", "red", "rgb(255,0,0)"];
      for (const color of badColors) {
        const data = { col: color } as ViewerChannelSettingParams;
        const result = deserializeViewerChannelSetting(0, data);
        expect(result.color).toBeUndefined();
      }
    });

    it("ignores bad float data", () => {
      const data = { cza: "NaN", isa: "bad", isv: "f8" } as ViewerChannelSettingParams;
      const result = deserializeViewerChannelSetting(0, data);
      expect(result.colorizeAlpha).toBeUndefined();
      expect(result.surfaceOpacity).toBeUndefined();
      expect(result.isovalue).toBeUndefined();
    });
  });

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
        lockPlotToDataRange: true,
        plotMax: 255,
      };
      const serializedCustomChannelState: Required<Omit<ViewerChannelSettingParams, "lut">> = {
        col: "03ff9d",
        ven: "0",
        sen: "0",
        isv: "0",
        isa: "0.54",
        clz: "0",
        cza: "1",
        cpe: "0",
        cps: "",
        rmp: "0:255",
      };
      expect(serializeViewerChannelSetting(customChannelState, false)).toEqual(serializedCustomChannelState);
    });
  });
});

describe("Viewer state", () => {
  const DEFAULT_VIEWER_STATE: ViewerState = {
    viewMode: ViewMode.threeD, // "XY", "XZ", "YZ"
    renderMode: RenderMode.volumetric, // "pathtrace", "maxproject"
    imageType: ImageType.segmentedCell,
    showAxes: false,
    showBoundingBox: false,
    backgroundColor: [0, 0, 0],
    boundingBoxColor: [255, 255, 255],
    autorotate: false,
    maskAlpha: 0,
    brightness: 70,
    density: 50,
    levels: [35, 140, 255],
    interpolationEnabled: true,
    region: { x: [0, 1], y: [0, 1], z: [0, 1] },
    slice: { x: 0.5, y: 0.5, z: 0.5 },
    time: 0,
    scene: 0,
    cameraState: undefined,
  };
  const SERIALIZED_DEFAULT_VIEWER_STATE: ViewerStateParams = {
    mode: "volumetric",
    view: "3D",
    image: "cell",
    axes: "0",
    bb: "0",
    bgcol: "000000",
    bbcol: "ffffff",
    rot: "0",
    mask: "0",
    bright: "70",
    dens: "50",
    lvl: "35,140,255",
    interp: "1",
    reg: "0:1,0:1,0:1",
    slice: "0.5,0.5,0.5",
    t: "0",
    scene: "0",
  };

  const CUSTOM_VIEWER_STATE: ViewerState = {
    renderMode: RenderMode.pathTrace,
    viewMode: ViewMode.xy,
    imageType: ImageType.fullField,
    showAxes: true,
    showBoundingBox: true,
    backgroundColor: [255, 0, 0],
    boundingBoxColor: [0, 255, 0],
    autorotate: true,
    maskAlpha: 55,
    brightness: 100,
    density: 75,
    levels: [0, 250, 251],
    interpolationEnabled: false,
    region: { x: [0, 0.5], y: [0, 1], z: [0, 1] },
    slice: { x: 0.25, y: 0.75, z: 0.5 },
    time: 100,
    scene: 3,
    cameraState: {
      position: [-1.05, -4, 45],
      target: [0, 0, 0],
      up: [0, 1, 0],
      orthoScale: 3.534,
      fov: 43.5,
    },
  };
  const SERIALIZED_CUSTOM_VIEWER_STATE: ViewerStateParams = {
    mode: "pathtrace",
    view: "Z",
    image: "fov",
    axes: "1",
    bb: "1",
    bgcol: "ff0000",
    bbcol: "00ff00",
    rot: "1",
    mask: "55",
    bright: "100",
    dens: "75",
    lvl: "0,250,251",
    interp: "0",
    reg: "0:0.5,0:1,0:1",
    slice: "0.25,0.75,0.5",
    t: "100",
    scene: "3",
    cam: "pos:-1.05:-4:45,tar:0:0:0,up:0:1:0,ort:3.534,fov:43.5",
  };

  describe("serializeViewerState", () => {
    it("serializes the default viewer settings", () => {
      expect(serializeViewerState(DEFAULT_VIEWER_STATE, false)).toEqual(SERIALIZED_DEFAULT_VIEWER_STATE);
    });

    it("serializes custom viewer settings", () => {
      expect(serializeViewerState(CUSTOM_VIEWER_STATE, false)).toEqual(SERIALIZED_CUSTOM_VIEWER_STATE);
    });

    it("shortens long numbers in the slice and region parameters", () => {
      // Floats should be rounded to 5 significant digits or less
      let state: Partial<ViewerState> = {
        region: { x: [0.4566666666, 0.8667332], y: [0.49999999, 0.8999999], z: [0.3000000001, 0.16467883] },
        slice: { x: 0.41111186, y: 0.49999999, z: 0.677402 },
      };
      let serializedState = serializeViewerState(state, true);
      expect(serializedState.reg).toEqual("0.45667:0.86673,0.5:0.9,0.3:0.16468");
      expect(serializedState.slice).toEqual("0.41111,0.5,0.6774");
    });
  });

  describe("deserializeViewerState", () => {
    it("returns an empty object for empty input", () => {
      expect(deserializeViewerState({})).toEqual({});
    });

    it("deserializes the default viewer settings", () => {
      const params = SERIALIZED_DEFAULT_VIEWER_STATE;
      expect(deserializeViewerState(params)).toEqual(DEFAULT_VIEWER_STATE);
    });

    it("deserializes custom viewer settings", () => {
      const params = SERIALIZED_CUSTOM_VIEWER_STATE;
      expect(deserializeViewerState(params)).toEqual(CUSTOM_VIEWER_STATE);
    });

    it("handles all ViewMode values", () => {
      const viewModes = Object.values(ViewMode);
      for (const viewMode of viewModes) {
        const state: ViewerState = { ...DEFAULT_VIEWER_STATE, viewMode };
        expect(deserializeViewerState(serializeViewerState(state, false)).viewMode).toEqual(viewMode);
      }
    });

    it("handles all RenderMode values", () => {
      const renderModes = Object.values(RenderMode);
      for (const renderMode of renderModes) {
        const state: ViewerState = { ...DEFAULT_VIEWER_STATE, renderMode };
        expect(deserializeViewerState(serializeViewerState(state, false)).renderMode).toEqual(renderMode);
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
      expect(deserializeViewerState({ cam: serializedState })).toEqual(state);
    });
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

//// DESERIALIZE STATES ///////////////////////

describe("Channel state deserialization", () => {
  const DEFAULT_CONTROL_POINTS = [
    { x: -10, opacity: 0, color: [0, 0, 0] },
    { x: 50, opacity: 0, color: [0, 0, 0] },
    { x: 100, opacity: 0.3, color: [0, 16, 255] },
    { x: 140, opacity: 0.8, color: [0, 255, 255] },
    { x: 260, opacity: 1, color: [0, 255, 180] },
  ];

  it("parses comma-separated control points", () => {
    const result = deserializeViewerChannelSetting(0, {
      cps: "-10:0:000000,50:0:000000,100:0.3:0010ff,140:0.8:00ffff,260:1:00ffb4",
    });
    expect(result.controlPoints).toEqual(DEFAULT_CONTROL_POINTS);
  });

  it("parses colon-separated control points", () => {
    const result = deserializeViewerChannelSetting(0, {
      cps: "-10:0:000000:50:0:000000:100:0.3:0010ff:140:0.8:00ffff:260:1:00ffb4",
    });
    expect(result.controlPoints).toEqual(DEFAULT_CONTROL_POINTS);
  });

  it("replaces '1' color strings with default color #ffffff", () => {
    const result = deserializeViewerChannelSetting(0, {
      cps: "0:0:1:50:1:1",
    });
    expect(result.controlPoints).toEqual([
      { x: 0, opacity: 0, color: [255, 255, 255] },
      { x: 50, opacity: 1, color: [255, 255, 255] },
    ]);
  });
});

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
        lut: ["p50", "p99"],
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
        lut: ["0", "255"],
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
        lut: ["autoij", ""],
      },
    ],
  ];

  it("parses unencoded per-channel setting", async () => {
    for (const [queryString, , expected] of channelParamToSetting) {
      const params = new URLSearchParams(queryString);
      const { args } = await parseViewerUrlParams(params);
      const channelSetting = args.viewerChannelSettings?.groups[0].channels[0]!;
      expect(channelSetting).toEqual(expected);
    }
  });

  it("parses encoded per-channel settings", async () => {
    for (const [, queryString, expected] of channelParamToSetting) {
      const params = new URLSearchParams(queryString);
      const { args } = await parseViewerUrlParams(params);
      const channelSetting = args.viewerChannelSettings?.groups[0].channels[0]!;
      expect(channelSetting).toEqual(expected);
    }
  });

  it("parses multiple per-channel settings", async () => {
    // Test unencoded (i=0) and encoded (i=1)
    for (let i = 0; i < 2; i++) {
      const queryString =
        channelParamToSetting[0][i] + "&" + channelParamToSetting[1][i] + "&" + channelParamToSetting[2][i];
      const params = new URLSearchParams(queryString);
      const { args } = await parseViewerUrlParams(params);
      const channelSettings = args.viewerChannelSettings?.groups[0].channels!;

      // Order is not guaranteed, so check if any of the expected settings are present
      expect(channelSettings).toContainEqual(channelParamToSetting[0][2]);
      expect(channelSettings).toContainEqual(channelParamToSetting[1][2]);
      expect(channelSettings).toContainEqual(channelParamToSetting[2][2]);
    }
  });

  it("overrides ch settings when per-channel settings are included", async () => {
    const queryString = "?ch=0&lut=1,2&c1=ven:1,lut:4:5";
    const params = new URLSearchParams(queryString);
    const { args } = await parseViewerUrlParams(params);

    const groups = args.viewerChannelSettings?.groups[0]!;
    expect(groups.channels).toHaveLength(1);
    const channelSetting = groups.channels[0];

    expect(channelSetting.match).toEqual(1);
    expect(channelSetting.enabled).toEqual(true);
    expect(channelSetting.lut).toEqual(["4", "5"]);
  });

  it("skips missing channel indices", async () => {
    const queryString = "?c0=ven:1&c15=ven:1,lut:4:5";
    const params = new URLSearchParams(queryString);
    const { args } = await parseViewerUrlParams(params);

    const groups = args.viewerChannelSettings?.groups[0]!;
    expect(groups.channels).toHaveLength(2);
    const channelSetting1 = groups.channels[0];
    const channelSetting2 = groups.channels[1];

    expect(channelSetting1.match).toEqual(0);
    expect(channelSetting1.enabled).toEqual(true);

    expect(channelSetting2.match).toEqual(15);
    expect(channelSetting2.enabled).toEqual(true);
    expect(channelSetting2.lut).toEqual(["4", "5"]);
  });

  it("creates empty default data for bad per-channel setting formats", async () => {
    const queryString = "c1=bad&c0=ultrabad:bad&c2=,,,,,,";
    const params = new URLSearchParams(queryString);
    const { args } = await parseViewerUrlParams(params);
    const channelSettings = args.viewerChannelSettings?.groups[0].channels!;
    expect(channelSettings).toHaveLength(3);
    for (let i = 0; i < channelSettings.length; i++) {
      const channelSetting = channelSettings[i];
      // Match with default on everything except match number
      expect(channelSetting).toEqual({ ...defaultSettings, match: channelSetting.match });
    }
  });

  it("enables first three channels by default if no channel settings are provided", async () => {
    const queryString = "url=https://example.com/image.tiff";
    const params = new URLSearchParams(queryString);
    const { args } = await parseViewerUrlParams(params);

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
    const params = new URLSearchParams(queryString);
    const { args, viewerSettings } = await parseViewerUrlParams(params);

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
    expect(channelSettings.channels[1].lut).toEqual(["autoij", ""]);
    expect(channelSettings.channels[2].match).toEqual(2);
    expect(channelSettings.channels[2].enabled).toEqual(true);
    expect(channelSettings.channels[2].colorizeEnabled).toEqual(true);
  });

  it("parses viewer settings", async () => {
    const queryString = "mask=30&view=X";
    const params = new URLSearchParams(queryString);
    const { viewerSettings } = await parseViewerUrlParams(params);
    expect(viewerSettings.viewMode).toEqual(ViewMode.yz);
    expect(viewerSettings.maskAlpha).toEqual(30);
  });

  it("returns an empty object when no params are passed in", async () => {
    const queryString = "";
    const params = new URLSearchParams(queryString);
    const { args, viewerSettings } = await parseViewerUrlParams(params);
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
        lockPlotToDataRange: true,
        plotMax: 255,
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
        lockPlotToDataRange: true,
        plotMax: 255,
      },
    ];
    const serialized = serializeViewerUrlParams({ channelSettings: channelStates }, false);
    // Format should look like "ven:1,col:ff0000,clz:1,cza:0.75,isa:0.5,sen:1,isv:128", but ordering
    // is not guaranteed. Parse the string and check that the values match the expected values.
    // Note that `lut` is not included when serializing from existing viewer state.
    const expectedChannel0: Required<Omit<ViewerChannelSettingParams, "lut">> = {
      ven: "1",
      col: "ff0000",
      clz: "1",
      cza: "0.5",
      isa: "0.75",
      sen: "1",
      isv: "128",
      rmp: "-10:260.1",
      cps: "0:0:808080:1:1:ff0000",
      cpe: "0",
    };
    const expectedChannel1: Required<Omit<ViewerChannelSettingParams, "lut">> = {
      ven: "0",
      col: "808080",
      clz: "0",
      cza: "0.2",
      isa: "0",
      sen: "0",
      isv: "57",
      rmp: "50:140",
      cps: "-10:0:000000:50:0:000000:100:0.3:0010ff:140:0.8:00ffff:260:1:00ffb4",
      cpe: "1",
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
