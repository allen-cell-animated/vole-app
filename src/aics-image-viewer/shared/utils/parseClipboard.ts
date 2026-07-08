import { deserializeChannelState, parseKeyValueList } from "../../state/deserialize";
import { objectToKeyValueList, serializeViewerChannelSetting } from "../../state/serialize";
import type { ChannelState } from "../../state/types";

export type ClipboardChannelStates = {
  version: string;
  channels: Record<string, string>;
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

export const channelStateToClipboard = (channelStates: ChannelState[]): ClipboardChannelStates => {
  const channels: Record<string, string> = {};
  for (const ch of channelStates) {
    const stateString = objectToKeyValueList(serializeViewerChannelSetting(ch, false));
    channels[ch.name] = stateString;
  }

  return { version: VOLEAPP_VERSION, channels };
};

export const clipboardToChannelState = (serialized: ClipboardChannelStates): Record<string, Partial<ChannelState>> => {
  const result: Record<string, Partial<ChannelState>> = {};
  for (const [name, state] of Object.entries(serialized.channels)) {
    result[name] = deserializeChannelState(parseKeyValueList(state));
  }
  return result;
};
