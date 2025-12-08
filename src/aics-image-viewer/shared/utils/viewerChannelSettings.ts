import type { ControlPoint } from "@aics/vole-core";

import { OTHER_CHANNEL_KEY, SINGLE_GROUP_CHANNEL_KEY } from "../constants";

/** Settings for a single channel, as passed in via props by App users */
export interface ViewerChannelSetting {
  // regex or string or array of regexes or strings or number for raw channel index
  // if you want to match on channel index, then you must provide the index here.
  match: (string | number)[] | string | number;

  // name is the display name for this channel.
  // if name is not given, use raw data channel name for display
  name?: string;

  // 6 digit hex rrggbb. defaults to auto-assigned by app
  color?: string;
  // default to false
  enabled?: boolean;
  // default to false
  surfaceEnabled?: boolean;
  /**
   * Min and max values for the intensity lookup table, which maps from raw intensity values
   * in the volume to opacity and color. Defaults to [0, 255].
   *
   * - Plain numbers are indices of histogram bins, in the range [0, 255].
   * - `v{n}` represents a raw intensity value, where `n` is an integer.
   * - `p{n}` represents a percentile, where `n` is a percentile in the [0, 100] range.
   * - `m{n}` represents the median multiplied by `n / 100`.
   * - `autoij` in either the min or max fields will use the "auto" algorithm
   * from ImageJ to select the min and max.
   */
  lut?: [string, string];
  /**
   * Whether to show control point controls instead of a simpler ramp control.
   * Defaults to false.
   */
  controlPointsEnabled?: boolean;
  controlPoints?: ControlPoint[];
  ramp?: [number, number];
  // valid when surfaceEnabled = true. default 128 or 0.5 of max intensity range
  isovalue?: number;
  // valid when surfaceEnabled = true. default 1.0 fully opaque
  surfaceOpacity?: number;
  colorizeEnabled?: boolean;
  colorizeAlpha?: number;
}

export interface ViewerChannelGroup {
  name: string;
  channels: ViewerChannelSetting[];
}

export interface ViewerChannelSettings {
  maskChannelName?: string;
  groups: ViewerChannelGroup[];
}

export type ChannelGrouping = { [key: string]: number[] };

export function matchChannel(channelName: string, channelIndex: number, c: ViewerChannelSetting): boolean {
  // c could be a number, an array of (strings or numbers), or a single regex
  if (typeof c.match === "number") {
    if (c.match === channelIndex) {
      return true;
    }
  } else if (Array.isArray(c.match)) {
    for (const r of c.match) {
      if (typeof r === "number") {
        if (r === channelIndex) {
          return true;
        }
      } else {
        const re = new RegExp(r);
        if (re.test(channelName)) {
          return true;
        }
      }
    }
  } else if (typeof c.match === "string") {
    const re = new RegExp(c.match);
    if (re.test(channelName)) {
      return true;
    }
  } else {
    throw new Error(
      "match is required for channel settings groups, and must be a string, number, or array of strings or numbers"
    );
  }
  return false;
}

function findFirstChannelMatchOfGroup(
  channel: string,
  channelIndex: number,
  g: ViewerChannelGroup
): ViewerChannelSetting | undefined {
  for (const c of g.channels) {
    if (matchChannel(channel, channelIndex, c)) {
      return c;
    }
  }
  return undefined;
}

export function findFirstChannelMatch(
  channel: string,
  channelIndex: number,
  settings: ViewerChannelSettings
): ViewerChannelSetting | undefined {
  if (!settings.groups) {
    return undefined;
  }
  for (const g of settings.groups) {
    const c = findFirstChannelMatchOfGroup(channel, channelIndex, g);
    if (c !== undefined) {
      return c;
    }
  }
  return undefined;
}

export function getDisplayName(name: string, index: number, settings?: ViewerChannelSettings): string {
  if (settings) {
    const c = findFirstChannelMatch(name, index, settings);
    if (c) {
      return c.name || name;
    }
  }
  return name;
}

export function makeChannelIndexGrouping(channels: string[], settings?: ViewerChannelSettings): ChannelGrouping {
  if (!channels) {
    return {};
  }
  if (!settings) {
    // return all channels
    return { [SINGLE_GROUP_CHANNEL_KEY]: channels.map((_val, index) => index) };
  }

  const groups = settings.groups;
  const grouping: ChannelGrouping = {};
  const channelsMatched: number[] = [];
  // this is kinda inefficient but we want to ensure the order as specified in viewerChannelSettings
  if (groups !== undefined) {
    for (const g of groups) {
      grouping[g.name] = [];
      g.channels.forEach((groupMatch) => {
        // check all channels against the match
        channels.forEach((channel, index) => {
          // make sure channel was not already matched someplace.
          if (!channelsMatched.includes(index)) {
            if (matchChannel(channel, index, groupMatch)) {
              grouping[g.name].push(index);
              channelsMatched.push(index);
            }
          }
        });
      });
    }
  }
  // now any channels not still matched go in the catchall group.
  if (channelsMatched.length < channels.length) {
    const remainderGroupName = groups.length === 0 ? SINGLE_GROUP_CHANNEL_KEY : OTHER_CHANNEL_KEY;
    grouping[remainderGroupName] = [];
    channels.forEach((channel, index) => {
      // make sure channel was not already matched someplace.
      if (!channelsMatched.includes(index)) {
        grouping[remainderGroupName].push(index);
      }
    });
  }
  return grouping;
}
