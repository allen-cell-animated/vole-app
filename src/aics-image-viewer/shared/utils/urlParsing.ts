import type { CameraState, ControlPoint } from "@aics/vole-core";
import type { FirebaseFirestore } from "@firebase/firestore-types";
import { isEqual } from "lodash";

import type { AppProps, MultisceneUrls } from "../../components/App/types";
import { deserializeViewerChannelSetting, deserializeViewerState, parseKeyValueList } from "../../state/deserialize";
import type { ViewerStore } from "../../state/store";
import {
  CameraTransformKeys,
  type ChannelState,
  ViewerChannelSettingKeys,
  type ViewerChannelStateParams,
  type ViewerState,
  ViewerStateParams,
} from "../../state/types";
import { getDefaultCameraState, getDefaultChannelState, getDefaultViewerState } from "../constants";
import { ViewMode } from "../enums";
import type { ManifestJson, MetadataRecord, PerAxis } from "../types";
import type { ColorArray } from "./colorRepresentations";
import { removeMatchingProperties, removeUndefinedProperties } from "./datatypes";
import FirebaseRequest, { type DatasetMetaData } from "./firebase";
import { readStoredMetadata, readStoredScenes } from "./storage";
import type { ViewerChannelSetting, ViewerChannelSettings } from "./viewerChannelSettings";

export const ENCODED_COMMA_REGEX = /%2C/g;
export const ENCODED_COLON_REGEX = /%3A/g;
const DEFAULT_CONTROL_POINT_COLOR: [number, number, number] = [255, 255, 255];
const DEFAULT_CONTROL_POINT_COLOR_CODE = "1";

const CHANNEL_STATE_KEY_REGEX = /^c[0-9]+$/;

/**
 * Enum keys for URL parameters. These are stored as enums for better readability,
 * and are mapped to types in `ViewerStateParams`.
 */
export enum ViewerStateKeys {
  View = "view",
  Mode = "mode",
  Mask = "mask",
  Image = "image",
  Axes = "axes",
  BoundingBox = "bb",
  BoundingBoxColor = "bbcol",
  BackgroundColor = "bgcol",
  Autorotate = "rot",
  Brightness = "bright",
  Density = "dens",
  Levels = "lvl",
  Interpolation = "interp",
  Region = "reg",
  Slice = "slice",
  Time = "t",
  Scene = "scene",
  CameraState = "cam",
  SingleChannelMode = "scm",
  SingleChannelIndex = "sci",
  UseExactScaleLevel = "esl",
  ScaleLevelIndex = "scl",
}

/**
 * Channels, matching the pattern `c0`, `c1`, etc. corresponding to the index of the channel being configured.
 * The channel parameter should have a value that is a comma-separated list of `key:value` pairs, with keys
 * defined in `ViewerChannelSettingJson`.
 */
type ChannelParams = { [_ in `c${number}`]?: string };

/** URL parameters that define data sources when loading volumes. */
class DataParams {
  /**
   * One or more volume URLs to load.
   *
   * This parameter may represent a single image with multiple data sources by delimiting each source URL with `,`.
   * It may also represent multiple scenes by delimiting each scene URL (and/or each collection of multiple
   * `,`-delimited source URLs) with `+`. E.g. `url1+url2,url3` represents a collection of two scenes, where the first
   * scene comes from `url1` and the second is a combination of the channels from the images at `url2` and `url3`.
   *
   * When parsing, we do our best to account for `%`-encoding, including the possibility that each source/scene URL was
   * encoded separately, then concatenated with the proper delimiters, then encoded again.
   */
  url?: string = undefined;
  /**
   * The URL of a JSON manifest. The JSON should contain two properties:
   *  - "scenes": A string array of volume URLs.
   *  - "meta": An array of metadata dictionary objects.
   *
   * See `ManifestJson` for the type definition.
   */
  manifest?: string = undefined;
  /** The name of a dataset in the Cell Feature Explorer database. Used with `id`. */
  dataset?: string = undefined;
  /** The ID of a cell within the loaded dataset. Used with `dataset`. */
  id?: string = undefined;
  /** The key of a collection of scenes stored in local storage. Overrides `url`. */
  collectionid?: string = undefined;
  /**
   * The origin of an opening window that wants to send a message to this window.
   *
   * The presence of this param implies that this window has just been opened by another app, and the opening app has
   * more data to send. Until that message is received, we fall back to `url`. Once that message arrives, the scenes to
   * open are written to local storage at a new `collectionid` and `msgorigin` is removed, allowing the window to
   * switch to reading local storage.
   *
   * All this happens independently of URL parsing, so the only meaningful thing this parsing code does with this param
   * is check whether it is present.
   */
  msgorigin?: string = undefined;
}

class DeprecatedParams {
  /** Deprecated query parameter for channel settings. */
  ch?: string = undefined;
  /** Deprecated query parameter for LUT settings. */
  luts?: string = undefined;
  /** Deprecated query parameter for channel colors. */
  colors?: string = undefined;
}

type AppParams = Partial<ViewerStateParams & DataParams & DeprecatedParams & ChannelParams>;

/**
 * A message sent from an external application after this app was opened,
 * containing data that was too large to pack into the URL.
 */
type ViewerMessage = {
  /** A (possibly very long) list of scene URLs. */
  scenes?: string[];
  /** A (likely very large) list of metadata records for each scene. */
  meta?: Record<string, MetadataRecord>;
  /** The scene to open once this message arrives. */
  sceneIndex?: number;
};

const allowedParamKeys: Array<keyof AppParams> = [
  ...Object.keys(new ViewerStateParams()),
  ...Object.keys(new DataParams()),
  ...Object.keys(new DeprecatedParams()),
] as Array<keyof AppParams>;
const isParamKey = (key: string): key is keyof AppParams => allowedParamKeys.indexOf(key as keyof AppParams) !== -1;
const isChannelKey = (key: string): key is keyof ChannelParams => CHANNEL_STATE_KEY_REGEX.test(key);

/**
 * Filters a set of URLSearchParams for only the keys that are valid parameters for the viewer.
 * Non-matching keys are discarded.
 * @param searchParams Input URL search parameters.
 * @returns a dictionary object matching the type of `Params`.
 */
export function getAllowedParams(searchParams: URLSearchParams): AppParams {
  const result: AppParams = {};
  for (const [key, value] of searchParams.entries()) {
    if (isParamKey(key) || isChannelKey(key)) {
      result[key] = value;
    }
  }
  return result;
}

/** Tries to retrieve the given `param` from a `search` string without using `URLSearchParams`, to avoid decoding. */
const getSearchParamRaw = (search: string, param: string): string | undefined => {
  const trimmedSearch = search.startsWith("?") ? search.slice(1) : search;
  const entries = trimmedSearch.split("&");
  const key = param + "=";
  const foundKeyValue = entries.find((keyValue) => keyValue.startsWith(key));
  return foundKeyValue?.slice(key.length);
};

/**
 * Applies `decodeURIComponent` over and over until `url` either seems to be a valid `URL` or satisfies `condition`.
 */
const decodeURLUntilParseable = (url: string, condition = (_url: string) => false): string => {
  let decoded = url;
  while (!condition(decoded) && !URL.canParse(decoded)) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) {
        return decoded;
      }
      decoded = nextDecoded;
    } catch {
      return decoded;
    }
  }
  return decoded;
};

/** Parses the `url` query param into a 2D URL array: one or more scenes, with one or more sources per scene. */
export const parseImageURLParam = (urlParam: string): string[][] => {
  // Decode until either any valid delimiters appear or `urlParam` is parseable as a single URL.
  const decodedScenes = decodeURLUntilParseable(urlParam, (url) => /[+ ,]/.test(url));
  // Split into scene URLs.
  const sceneUrls = decodedScenes.split(/[+ ]/);

  return sceneUrls.map((scene) => {
    // Split each scene into multiple sources, if any.
    const decodedSources = decodeURLUntilParseable(scene, (url) => url.includes(","));
    const sourceUrls = decodedSources.split(",");
    if (sourceUrls.length === 1) {
      return sourceUrls;
    }

    // Try to make sure the source URLs are decoded as well.
    return sourceUrls.map((source) => decodeURLUntilParseable(source));
  });
};

//// DATA PARSING //////////////////////

function decodeColons(str: string): string {
  return str.replace(ENCODED_COLON_REGEX, ":");
}

export function objectToKeyValueList(obj: Record<string, string | undefined>): string {
  const keyValuePairs: string[] = [];
  for (const key in obj) {
    const value = obj[key];
    if (value === undefined) {
      continue;
    }
    // Allow colon separators to remain unencoded to save URL character length.
    const escapedValue = decodeColons(encodeURIComponent(value.trim()));
    keyValuePairs.push(`${encodeURIComponent(key.trim())}:${escapedValue}`);
  }
  return keyValuePairs.join(",");
}

function colorArrayToHex(color: ColorArray): string {
  return color
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();
}

/**
 * Formats a float or integer value to a string with a maximum precision for float values.
 * @param value The number to format.
 * @param maxPrecision The maximum number of significant digits to display for float values.
 * Default is 7.
 * @returns
 * - For integers, the integer value as a string.
 * - For floats, the float value as a string with a maximum of `maxPrecision` significant digits
 * and any trailing zeroes removed.
 *
 * @example
 * ```
 * formatFloat(1.23456, 3) // "1.23"
 * formatFloat(123456, 3) // "123456"
 * formatFloat(1.3999999999999999, 3) // "1.4"
 * ```
 */
function formatFloat(value: number, maxPrecision: number = 7): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return Number(value.toPrecision(maxPrecision)).toString();
}

function perAxisToArray<T>(perAxis: PerAxis<T>): T[] {
  return [perAxis.x, perAxis.y, perAxis.z];
}

/** Serializes a region into a `x1:x2,y1:y2,z1:z2` string format. */
function serializeRegion(region: PerAxis<[number, number]>): string {
  return perAxisToArray(region)
    .map((axis) => axis.map((val) => formatFloat(val)).join(":"))
    .join(",");
}

/** Serializes a slice parameter into a `x,y,z` string format. */
function serializeSlice(slice: PerAxis<number>): string {
  return perAxisToArray(slice)
    .map((val) => formatFloat(val))
    .join(",");
}

function serializeBoolean(value: boolean | undefined): "1" | "0" | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? "1" : "0";
}

export function serializeCameraState(
  cameraState: Partial<CameraState>,
  removeDefaults: boolean,
  viewMode: ViewMode = ViewMode.threeD
): string | undefined {
  if (removeDefaults) {
    // Note that we use the `getDefaultCameraState()` to get the defaults here,
    // instead of `getDefaultViewerState().cameraState`. The latter is undefined, which signals
    // that the camera should not be modified for URLs that don't specify it.
    cameraState = removeMatchingProperties(cameraState, getDefaultCameraState(viewMode));
    if (Object.keys(cameraState).length === 0) {
      return undefined;
    }
  }
  const cameraString = objectToKeyValueList({
    [CameraTransformKeys.Position]:
      cameraState.position && cameraState.position.map((value) => formatFloat(value)).join(":"),
    [CameraTransformKeys.Target]: cameraState.target && cameraState.target.map((value) => formatFloat(value)).join(":"),
    [CameraTransformKeys.Up]: cameraState.up && cameraState.up.map((value) => formatFloat(value)).join(":"),
    [CameraTransformKeys.OrthoScale]:
      cameraState.orthoScale === undefined ? undefined : formatFloat(cameraState.orthoScale),
    [CameraTransformKeys.Fov]: cameraState.fov === undefined ? undefined : formatFloat(cameraState.fov),
  });
  return cameraString === "" ? undefined : cameraString;
}

function serializeControlPoints(controlPoints: ControlPoint[]): string {
  return controlPoints
    .map((cp) => {
      const x = formatFloat(cp.x);
      const opacity = formatFloat(cp.opacity);
      // Default color is empty string
      // TODO: Substitute
      const color = isEqual(cp.color, DEFAULT_CONTROL_POINT_COLOR)
        ? DEFAULT_CONTROL_POINT_COLOR_CODE
        : colorArrayToHex(cp.color);
      return `${x}:${opacity}:${color}`;
    })
    .join(":");
}

//// DATA SERIALIZATION //////////////////////

/**
 * Serializes a single viewer channel setting into a dictionary of URL parameters
 * (`ViewerChannelSettingParams`).
 * @param channelSetting The channel state object to serialize.
 * @param removeDefaults Whether to remove properties that match the output of `GET_DEFAULT_CHANNEL_STATE`.
 * @returns A `ViewerChannelSettingParams` object with the serialized parameters. Undefined values are removed.
 */
export function serializeViewerChannelSetting(
  channelSetting: Partial<ChannelState>,
  removeDefaults: boolean
): Partial<ViewerChannelStateParams> {
  if (removeDefaults) {
    channelSetting = removeMatchingProperties(channelSetting, getDefaultChannelState());
  }
  return removeUndefinedProperties({
    [ViewerChannelSettingKeys.VolumeEnabled]: serializeBoolean(channelSetting.volumeEnabled),
    [ViewerChannelSettingKeys.SurfaceEnabled]: serializeBoolean(channelSetting.isosurfaceEnabled),
    [ViewerChannelSettingKeys.IsosurfaceValue]: channelSetting.isovalue?.toString(),
    [ViewerChannelSettingKeys.IsosurfaceAlpha]: channelSetting.opacity?.toString(),
    [ViewerChannelSettingKeys.Colorize]: serializeBoolean(channelSetting.colorizeEnabled),
    [ViewerChannelSettingKeys.ColorizeAlpha]: channelSetting.colorizeAlpha?.toString(),
    [ViewerChannelSettingKeys.Color]: channelSetting.color && colorArrayToHex(channelSetting.color),
    [ViewerChannelSettingKeys.ControlPoints]:
      channelSetting.controlPoints && serializeControlPoints(channelSetting.controlPoints),
    [ViewerChannelSettingKeys.ControlPointsEnabled]: serializeBoolean(channelSetting.useControlPoints),
    [ViewerChannelSettingKeys.Ramp]: channelSetting.ramp?.join(":"),
    [ViewerChannelSettingKeys.KeepRange]: serializeBoolean(channelSetting.keepIntensityRange),
    // Note that Lut is not saved here, as it is expected as user input and is redundant with
    // the control points and ramp.
  });
}

/**
 * Serializes a ViewerState object into a dictionary of URL parameters.
 * @param state The ViewerState to serialize.
 * @param removeDefaults If true, remove properties that match the output of `GET_DEFAULT_VIEWER_STATE`.
 * @returns A `ViewerStateParams` object with the serialized parameters. Undefined values are removed.
 */
export function serializeViewerState(state: Partial<ViewerState>, removeDefaults: boolean): ViewerStateParams {
  if (removeDefaults) {
    state = removeMatchingProperties(state, getDefaultViewerState());
    // special case: if there's an explicit scale level but it's not being used, no reason to include it
    if (state.scaleLevelIndex !== undefined && state.useExactScaleLevel === undefined) {
      delete state.scaleLevelIndex;
    }
  }
  const result: ViewerStateParams = {
    [ViewerStateKeys.Mode]: state.renderMode,
    [ViewerStateKeys.Mask]: state.maskAlpha?.toString(),
    [ViewerStateKeys.Image]: state.imageType,
    [ViewerStateKeys.Axes]: serializeBoolean(state.showAxes),
    [ViewerStateKeys.BoundingBox]: serializeBoolean(state.showBoundingBox),
    [ViewerStateKeys.BoundingBoxColor]: state.boundingBoxColor && colorArrayToHex(state.boundingBoxColor),
    [ViewerStateKeys.BackgroundColor]: state.backgroundColor && colorArrayToHex(state.backgroundColor),
    [ViewerStateKeys.Autorotate]: serializeBoolean(state.autorotate),
    [ViewerStateKeys.Brightness]: state.brightness?.toString(),
    [ViewerStateKeys.Density]: state.density?.toString(),
    [ViewerStateKeys.Interpolation]: serializeBoolean(state.interpolationEnabled),
    [ViewerStateKeys.Region]: state.region && serializeRegion(state.region),
    [ViewerStateKeys.Slice]: state.slice && serializeSlice(state.slice),
    [ViewerStateKeys.Levels]: state.levels?.join(","),
    [ViewerStateKeys.Time]: state.time?.toString(),
    [ViewerStateKeys.Scene]: state.scene?.toString(),
    [ViewerStateKeys.SingleChannelMode]: serializeBoolean(state.singleChannelMode),
    [ViewerStateKeys.SingleChannelIndex]: state.singleChannelIndex?.toString(),
    [ViewerStateKeys.UseExactScaleLevel]: serializeBoolean(state.useExactScaleLevel),
    [ViewerStateKeys.ScaleLevelIndex]: state.scaleLevelIndex?.toString(),
    [ViewerStateKeys.CameraState]:
      state.cameraState && serializeCameraState(state.cameraState as CameraState, removeDefaults, state.viewMode),
  };

  const viewModeToViewParam = {
    [ViewMode.threeD]: "3D",
    [ViewMode.xy]: "Z",
    [ViewMode.xz]: "Y",
    [ViewMode.yz]: "X",
  };
  result[ViewerStateKeys.View] = state.viewMode && viewModeToViewParam[state.viewMode];
  return removeUndefinedProperties(result);
}

function parseDeprecatedChannelSettings(params: DeprecatedParams): ViewerChannelSettings | undefined {
  // old, deprecated channels model
  if (params.ch) {
    // ?ch=1,2
    // ?luts=0,255,0,255
    // ?colors=ff0000,00ff00
    const initialChannelSettings: ViewerChannelSettings = {
      groups: [{ name: "Channels", channels: [] }],
    };
    const ch = initialChannelSettings.groups[0].channels;

    const channelsOn = params.ch.split(",").map((numstr) => Number.parseInt(numstr, 10));
    for (let i = 0; i < channelsOn.length; ++i) {
      ch.push({ match: channelsOn[i], enabled: true });
    }
    // look for luts or color
    if (params.luts) {
      const luts = params.luts.split(",");
      if (luts.length !== ch.length * 2) {
        console.warn("ILL-FORMED QUERYSTRING: luts must have a min/max for each ch");
      } else {
        for (let i = 0; i < ch.length; ++i) {
          ch[i]["lut"] = [luts[i * 2], luts[i * 2 + 1]];
        }
      }
    }
    if (params.colors) {
      const colors = params.colors.split(",");
      if (colors.length !== ch.length) {
        console.warn("ILL-FORMED QUERYSTRING: if colors specified, must have a color for each ch");
      } else {
        for (let i = 0; i < ch.length; ++i) {
          ch[i]["color"] = colors[i];
        }
      }
    }
    return initialChannelSettings;
  }
  return undefined;
}

function parseChannelSettings(params: ChannelParams): ViewerChannelSettings | undefined {
  // Channels keys are formatted as `c0`, `c1`, etc., and the value is string containing
  // a comma-separated list of key-value pairs.
  const channelIndexToSettings: Map<number, ViewerChannelSetting> = new Map();
  Object.keys(params).forEach((key) => {
    if (isChannelKey(key)) {
      const channelIndex = Number.parseInt(key.slice(1), 10);
      try {
        const channelData = parseKeyValueList(params[key]!);
        const channelSetting = deserializeViewerChannelSetting(channelIndex, channelData as ViewerChannelStateParams);
        channelIndexToSettings.set(channelIndex, channelSetting);
      } catch (e) {
        console.warn(
          `url_utils.getArgsFromParams: Failed to parse channel settings for channel ${channelIndex} from URL parameters.`,
          e
        );
      }
    }
  });
  if (channelIndexToSettings.size > 0) {
    const groups: ViewerChannelSettings["groups"] = [
      {
        name: "Channels",
        channels: Array.from(channelIndexToSettings.values()),
      },
    ];
    return { groups };
  }

  return undefined;
}

//// FULL URL PARSING //////////////////////
async function loadDataset(firestore: FirebaseFirestore, dataset: string, id: string): Promise<Partial<AppProps>> {
  const db = new FirebaseRequest(firestore);
  const args: Partial<AppProps> = {};

  const datasets = await db.getAvailableDatasets();

  let datasetMeta: DatasetMetaData | undefined = undefined;
  for (const d of datasets) {
    const innerDatasets = d.datasets!;
    const names = Object.keys(innerDatasets);
    const matchingName = names.find((name) => name === dataset);
    if (matchingName) {
      datasetMeta = innerDatasets[matchingName];
      break;
    }
  }
  if (datasetMeta === undefined) {
    console.error(`No matching dataset: ${dataset}`);
    return {};
  }

  const datasetData = await db.selectDataset(datasetMeta.manifest!);
  const baseUrl = datasetData.volumeViewerDataRoot + "/";
  args.imageDownloadHref = datasetData.downloadRoot + "/" + id;
  // args.fovDownloadHref = datasetData.downloadRoot + "/" + id;

  const fileInfo = await db.getFileInfoByCellId(id);
  args.imageUrl = baseUrl + fileInfo!.volumeviewerPath;
  args.parentImageUrl = baseUrl + fileInfo!.fovVolumeviewerPath;

  return args;
}

function isStringArray(arr: any[]): arr is string[] {
  return Array.isArray(arr) && arr.every((item) => typeof item === "string");
}

function isValidScenesArray(arr: any[]): arr is (string | string[])[] {
  return Array.isArray(arr) && arr.every((item) => typeof item === "string" || isStringArray(item));
}

export async function loadFromManifest(
  manifestUrl: string
): Promise<{ scenes: (string | string[])[]; metadata?: MetadataRecord[] }> {
  let response: Response;
  let manifestJson: ManifestJson;

  // Fetch manifest
  try {
    response = await fetch(manifestUrl);
  } catch (error) {
    console.error(error);
    throw new Error(`JSON manifest could not be fetched from URL '${manifestUrl}': ${error}`);
  }
  if (!response.ok) {
    throw new Error(
      `JSON manifest could not be fetched from URL '${manifestUrl}': Received ${response.status} ${response.statusText}`
    );
  }
  // Parse JSON
  try {
    manifestJson = await response.json();
  } catch (error) {
    throw new Error(`Could not parse JSON manifest from URL '${manifestUrl}': ${error}`);
  }

  // Parse scenes
  let scenes = manifestJson.scenes;
  if (scenes === undefined) {
    throw new Error(`No 'scenes' property was found in JSON manifest from URL '${manifestUrl}'`);
  }
  if (typeof scenes === "string") {
    scenes = [scenes];
  }
  if (!Array.isArray(scenes) || scenes.length === 0 || !isValidScenesArray(scenes)) {
    throw new Error(
      `Invalid 'scenes' property found in JSON manifest from URL '${manifestUrl}'. 'scenes' must be a non-empty array of strings or string arrays.`
    );
  }

  // Parse metadata
  let metadata: MetadataRecord[] | undefined = undefined;
  if (manifestJson.meta !== undefined && Array.isArray(manifestJson.meta)) {
    metadata = manifestJson.meta;
  }
  return { scenes, metadata };
}

/**
 * Parses a set of URL search parameters into props for the viewer.
 * @param search The query string to parse, which must be valid in the `URLSearchParams constructor
 * @param firestore Optional Firestore instance. If provided, the function can load data from a
 * Firestore dataset if the `dataset` and `id` parameters are provided.
 * @returns An object containing:
 * - `args`: Partial AppProps object.
 * - `viewerSettings`: Partial ViewerState object.
 *
 * `args` can be passed as props to the `ImageViewerApp`, and `viewerSettings` can be passed to `ViewerStateProvider`.
 */
export async function parseViewerUrlParams(
  search: string,
  firestore?: FirebaseFirestore
): Promise<{
  args: Partial<AppProps>;
  viewerSettings: Partial<ViewerState>;
}> {
  const searchParams = new URLSearchParams(search);
  const params = getAllowedParams(searchParams);
  let args: Partial<AppProps> = {};
  // Parse viewer state
  const viewerSettings: Partial<ViewerState> = deserializeViewerState(params);

  // Parse channel settings. If per-channel settings are provided, they will override
  // the old `ch` query parameter.
  const deprecatedChannelSettings = parseDeprecatedChannelSettings(params);
  const channelSettings = parseChannelSettings(params);
  args.viewerChannelSettings = channelSettings ?? deprecatedChannelSettings;

  // Parse data sources (URL or dataset/id pair)
  if (params.manifest !== undefined || params.url !== undefined || params.collectionid !== undefined) {
    let scenes: (string | string[])[];

    if (params.manifest) {
      const { scenes: manifestScenes, metadata: manifestMetadata } = await loadFromManifest(params.manifest);
      scenes = manifestScenes;
      args.metadata = manifestMetadata ?? undefined;
    } else {
      // Load from URL or storage
      const { collectionid, msgorigin } = params;
      const getFromStorage = collectionid !== undefined && msgorigin === undefined;
      const urlParamFromStorage = getFromStorage ? readStoredScenes(collectionid) : undefined;
      const urlParam = urlParamFromStorage ?? getSearchParamRaw(search, "url")!;
      scenes = parseImageURLParam(urlParam);
      args.metadata = readStoredMetadata(scenes);
    }

    const firstScene = scenes[0];
    // Get the very first URL for the download button
    const firstUrl = Array.isArray(firstScene) ? firstScene[0] : firstScene;
    // If there's only one url, just pass that
    const imageUrls: string | MultisceneUrls = scenes.length > 1 || firstScene.length > 1 ? { scenes } : firstScene[0];

    args.cellId = "1";
    args.imageUrl = imageUrls;
    // this is invalid for zarr?
    args.imageDownloadHref = firstUrl;
    args.parentImageUrl = "";
    args.parentImageDownloadHref = "";
    // Check if channel settings are already provided (through per-channel settings or
    // old `ch` query param, or included in JSON files). If not, make first three
    // channels visible by default.
    if (!firstUrl.endsWith("json") && !args.viewerChannelSettings) {
      args.viewerChannelSettings = {
        groups: [
          // first 3 channels on by default!
          {
            name: "Channels",
            channels: [
              { match: [0, 1, 2], enabled: true },
              { match: "(.+)", enabled: false },
            ],
          },
        ],
      };
    }
  } else if (params.dataset && params.id && firestore) {
    // ?dataset=aics_hipsc_v2020.1&id=232265
    const datasetArgs = await loadDataset(firestore, params.dataset, params.id);
    args = { ...args, ...datasetArgs };
  }

  return { args: removeUndefinedProperties(args), viewerSettings: removeUndefinedProperties(viewerSettings) };
}

/** Adds the data in a newly-arrived `ViewerMessage` to an existing stored `AppProps` instance. */
export function addViewerParamsFromMessage<P extends Pick<AppProps, "imageUrl" | "metadata">>(
  args: P,
  message: ViewerMessage
): P {
  // get scenes
  const { imageUrl } = args;
  const scenes = message.scenes ?? (typeof imageUrl === "string" ? [imageUrl] : imageUrl.scenes);
  const firstScene = scenes[0];
  const newImageUrl = scenes.length === 1 && typeof firstScene === "string" ? firstScene : { scenes };

  // get metadata
  const { meta } = message;
  const messageMeta =
    meta &&
    scenes.map((scene) => {
      if (Array.isArray(scene)) {
        // can't handle multi-source scenes (yet)
        return undefined;
      }

      return meta[scene] as MetadataRecord | undefined;
    });
  const newMetadata = messageMeta ?? args.metadata;

  if (newMetadata === undefined) {
    return { ...args, imageUrl: newImageUrl };
  } else {
    return { ...args, imageUrl: newImageUrl, metadata: newMetadata };
  }
}

/**
 * Serializes the ViewerState and ChannelState of a ViewerStateContext into a URLSearchParams object.
 * @param state ViewerStateContext to serialize.
 * @param removeDefaults If true, shortens parameters by removing any properties that match the default state.
 * This includes the output of GET_DEFAULT_VIEWER_STATE and GET_DEFAULT_CHANNEL_STATE.
 */
export function serializeViewerUrlParams(state: Partial<ViewerStore>, removeDefaults: boolean = true): AppParams {
  const params = serializeViewerState(state, removeDefaults);

  const channelParams = state.channelSettings?.reduce<Record<string, string>>(
    (acc, channelSetting, index): Record<string, string> => {
      const key = `c${index}`;
      acc[key] = objectToKeyValueList(
        serializeViewerChannelSetting(channelSetting, removeDefaults) as Record<string, string>
      );
      return acc;
    },
    {} as Record<string, string>
  );

  return { ...params, ...channelParams };
}
