import { snapshotToChannelState, snapshotToViewerChannelSetting } from "../../state/deserialize";
import { channelStateToSnapshot } from "../../state/serialize";
import type { ChannelState, ChannelStateSnapshot, ViewerStateSnapshot } from "../../state/types";
import { cloneChannelState } from "../../state/util";
import type { ViewerChannelSettings } from "./viewerChannelSettings";

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
