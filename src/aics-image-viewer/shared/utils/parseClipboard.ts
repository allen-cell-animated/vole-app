import type { MultisceneUrls } from "../../components/App/types";
import { snapshotToChannelState, snapshotToViewerChannelSetting } from "../../state/deserialize";
import { channelStateToSnapshot } from "../../state/serialize";
import type { ChannelState, ChannelStateSnapshot, ViewerStateSnapshot } from "../../state/types";
import { cloneChannelState } from "../../state/util";
import type { MetadataRecord } from "../types";
import type { ViewerChannelSettings } from "./viewerChannelSettings";

/**
 * A message sent from an external application after this app was opened,
 * containing data that was too large to pack into the URL.
 */
export type ViewerMessage = {
  /** A (possibly very long) list of scene URLs. */
  scenes?: (string | string[])[];
  /** A (likely very large) list of metadata records for each scene. */
  meta?: Record<string, MetadataRecord>;
  /** The scene to open once this message arrives. */
  sceneIndex?: number;
};

/** A snapshot of app state, containing (optional) global and per-channel settings. */
export type StoreSnapshot = ViewerStateSnapshot & {
  version: string;
  channels: Record<string, ChannelStateSnapshot>;
};

/**
 * A complete description of a viewer session, containing image URLs, global
 * and per-channel settings, and optional image metadata.
 */
export type SessionSnapshot = StoreSnapshot & ViewerMessage & Required<Pick<ViewerMessage, "scenes">>;

/** Verifies that the given object is (likely) a `StoreSnapshot`. */
export const isStoreSnapshot = (settings: unknown): settings is StoreSnapshot => {
  const castSettings = settings as StoreSnapshot;
  return (
    settings !== null &&
    settings !== undefined &&
    typeof castSettings.version === "string" &&
    typeof castSettings.channels === "object" &&
    !Array.isArray(castSettings.channels) &&
    Object.entries(castSettings.channels).every(
      ([key, value]) => typeof key === "string" && typeof value === "object" && !Array.isArray(value)
    )
  );
};

/** Verifies that the given object is (likely) a `SessionSnapshot`. */
export const isSessionSnapshot = (settings: unknown): settings is SessionSnapshot => {
  if (!isStoreSnapshot(settings)) {
    return false;
  }
  const { scenes } = settings as SessionSnapshot;
  return (
    Array.isArray(scenes) &&
    scenes.every(
      (scene) => typeof scene === "string" || (Array.isArray(scene) && scene.every((url) => typeof url === "string"))
    )
  );
};

/** Converts an array of `ChannelState`s to a compact JSON representation that can be stringified into the clipboard. */
export const channelStatesToSnapshot = (
  channelStates: ChannelState[],
  excludeKeys?: (keyof ChannelState)[]
): StoreSnapshot => {
  const channels: Record<string, ChannelStateSnapshot> = {};
  for (const ch of channelStates) {
    const setting = cloneChannelState(ch);
    if (excludeKeys !== undefined) {
      for (const key of excludeKeys) {
        delete setting[key];
      }
    }
    const state = channelStateToSnapshot(setting, false);
    channels[ch.name] = state;
  }

  return { version: VOLEAPP_VERSION, channels };
};

/** Converts a compacted set of `ChannelState`s from the clipboard into a record of channel names and their states. */
export const snapshotToChannelStates = (serialized: StoreSnapshot): Record<string, Partial<ChannelState>> => {
  const result: Record<string, Partial<ChannelState>> = {};
  for (const [name, state] of Object.entries(serialized.channels)) {
    result[name] = { ...snapshotToChannelState(state), name };
  }
  return result;
};

export const snapshotToViewerChannelSettings = (serialized: StoreSnapshot): ViewerChannelSettings | undefined => {
  const snapshots = Object.entries(serialized.channels);
  if (snapshots.length === 0) {
    return undefined;
  }
  const channels = snapshots.map(([name, snap]) => snapshotToViewerChannelSetting(name, snap));
  return { groups: [{ name: "Channels", channels }] };
};

/**
 * Parses a `ViewerMessage` into the relevant entries in `AppProps`.
 *
 * Optionally accepts the current value of the `imageUrl` prop, for the case where the message contains only metadata
 * and the image URLs that correspond to the metadata were passed in by other means.
 */
export function viewerMessageToParams(
  message: ViewerMessage,
  propUrl?: string | MultisceneUrls
): { imageUrl?: string | MultisceneUrls; metadata?: (MetadataRecord | undefined)[] } {
  // get scenes
  const scenes = message.scenes ?? (propUrl && (typeof propUrl === "string" ? [propUrl] : propUrl.scenes));
  if (scenes === undefined || scenes === "") {
    return {};
  }
  const firstScene = scenes[0];
  const imageUrl = scenes.length === 1 && typeof firstScene === "string" ? firstScene : { scenes };

  // get metadata
  const { meta } = message;
  const metadata =
    meta &&
    scenes.map((scene) => {
      if (Array.isArray(scene)) {
        // can't handle multi-source scenes (yet)
        return undefined;
      }

      return meta[scene] as MetadataRecord | undefined;
    });

  return { imageUrl, metadata };
}

/** Formats the values of the `imageUrl` and `metadata` props to `App` as a `ViewerMessage`. */
export function paramsToViewerMessage(
  imageUrl: string | MultisceneUrls,
  metadata?: (MetadataRecord | undefined)[]
): ViewerMessage {
  const scenes = typeof imageUrl === "string" ? [imageUrl] : imageUrl.scenes;

  if (metadata === undefined) {
    return { scenes };
  }

  const meta: Record<string, MetadataRecord> = {};
  scenes.forEach((scene, index) => {
    const value = metadata[index];
    // Can't save a metadata record if there isn't any metadata or the image is multi-source
    if (value === undefined || (Array.isArray(scene) && scene.length > 1)) {
      return;
    }
    meta[Array.isArray(scene) ? scene[0] : scene] = value;
  });

  return { scenes, meta };
}
