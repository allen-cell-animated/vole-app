import type { AppProps } from "../../components/App/types";
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
  scenes?: string[];
  /** A (likely very large) list of metadata records for each scene. */
  meta?: Record<string, MetadataRecord>;
  /** The scene to open once this message arrives. */
  sceneIndex?: number;
};

export type StoreSnapshot = ViewerStateSnapshot & {
  version: string;
  channels: Record<string, ChannelStateSnapshot>;
};

/** Verifies that the given object is (likely) a `ClipboardChannelStates` */
export const isStoreSnapshot = (settings: unknown): settings is StoreSnapshot => {
  const castSettings = settings as StoreSnapshot;
  return (
    settings !== null &&
    settings !== undefined &&
    typeof castSettings.version === "string" &&
    typeof castSettings.channels === "object" &&
    !Array.isArray(castSettings.channels) &&
    Object.keys(castSettings.channels).every((key) => typeof key === "string")
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
