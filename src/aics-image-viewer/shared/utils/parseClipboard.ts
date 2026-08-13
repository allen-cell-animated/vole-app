import { snapshotToChannelState } from "../../state/deserialize";
import { channelStateToSnapshot } from "../../state/serialize";
import type { ChannelState, ChannelStateSnapshot } from "../../state/types";
import { cloneChannelState } from "../../state/util";

export type ClipboardChannelStates = {
  version: string;
  channels: Record<string, ChannelStateSnapshot>;
};

/** Verifies that the given object is (likely) a `ClipboardChannelStates` */
export const isClipboardChannelState = (settings: unknown): settings is ClipboardChannelStates => {
  const castSettings = settings as ClipboardChannelStates;
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
export const channelStateToClipboard = (
  channelStates: ChannelState[],
  excludeKeys?: (keyof ChannelState)[]
): ClipboardChannelStates => {
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
export const clipboardToChannelState = (serialized: ClipboardChannelStates): Record<string, Partial<ChannelState>> => {
  const result: Record<string, Partial<ChannelState>> = {};
  for (const [name, state] of Object.entries(serialized.channels)) {
    result[name] = { ...snapshotToChannelState(state), name };
  }
  return result;
};
