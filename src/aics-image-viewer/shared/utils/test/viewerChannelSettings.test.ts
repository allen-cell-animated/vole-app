import { describe, expect, it } from "@jest/globals";

import type { ChannelGrouping, ViewerChannelSetting, ViewerChannelSettings } from "../viewerChannelSettings";
import { makeChannelIndexGrouping, matchChannel } from "../viewerChannelSettings";

describe("viewer settings", () => {
  describe("matching names", () => {
    it.each([
      ["test1", [true, false, false]],
      ["test", [true, true, true]],
      ["^test$", [false, false, false]],
      ["1|2", [true, true, false]],
      [1, [false, true, false]],
    ])("matches against %p", (re, expected) => {
      const channelNames = ["test1", "test2", "test3"];
      const setting: ViewerChannelSetting = { match: re };
      const result = channelNames.map((ch, i) => {
        return matchChannel(ch, i, setting);
      });
      expect(result).toEqual(expected);
    });
  });
  describe("grouping channels", () => {
    it("groups channels into their named groups when all match", () => {
      const channelNames = ["test1", "test2", "test3"];
      const settings: ViewerChannelSettings = {
        groups: [
          { name: "1", channels: [{ match: "2" }] },
          { name: "2", channels: [{ match: "3" }] },
          { name: "3", channels: [{ match: "1" }] },
        ],
        maskChannelName: "",
      };
      const expected: ChannelGrouping = { "1": [1], "2": [2], "3": [0] };
      const result = makeChannelIndexGrouping(channelNames, settings);
      expect(Object.keys(result).length).toBe(3);
      for (const i in result) {
        expect(result[i].length).toBe(1);
        expect(result[i]).toEqual(expected[i]);
      }
    });
    it('groups channels into group "Other" when none match', () => {
      const channelNames = ["test1", "test2", "test3"];
      const settings: ViewerChannelSettings = {
        groups: [
          { name: "1", channels: [{ match: "z" }] },
          { name: "2", channels: [{ match: "y" }] },
          { name: "3", channels: [{ match: "x" }] },
        ],
        maskChannelName: "",
      };
      const expected: ChannelGrouping = { "1": [], "2": [], "3": [], Other: [0, 1, 2] };
      const result = makeChannelIndexGrouping(channelNames, settings);
      expect(Object.keys(result).length).toBe(4);
      for (const i in result) {
        expect(result[i]).toEqual(expected[i]);
      }
    });
    it('groups channels into named groups and "Other" when only some match', () => {
      const channelNames = ["test1", "test2", "test3"];
      const settings: ViewerChannelSettings = {
        groups: [
          { name: "1", channels: [{ match: "1" }] },
          { name: "2", channels: [{ match: "2" }] },
          { name: "3", channels: [{ match: "x" }] },
        ],
        maskChannelName: "",
      };
      const expected: ChannelGrouping = { "1": [0], "2": [1], "3": [], Other: [2] };
      const result = makeChannelIndexGrouping(channelNames, settings);
      expect(Object.keys(result).length).toBe(4);
      for (const i in result) {
        expect(result[i]).toEqual(expected[i]);
      }
    });
    it('groups all channels into group "Channels" when no groups are given', () => {
      const channelNames = ["test1", "test2", "test3"];
      const settings: ViewerChannelSettings = {
        groups: [],
        maskChannelName: "",
      };
      const expected: ChannelGrouping = { Channels: [0, 1, 2] };
      const result = makeChannelIndexGrouping(channelNames, settings);
      expect(Object.keys(result).length).toBe(1);
      for (const i in result) {
        expect(result[i]).toEqual(expected[i]);
      }
    });
  });
});
