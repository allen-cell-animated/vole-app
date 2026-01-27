import { describe, expect, it } from "@jest/globals";

import { readStoredMetadata, readStoredScenes, writeMetadata, writeScenes } from "../storage";

const LONG_STRING = `\
This is a very long string, long enough that it dwarfs the size of other example data used in this test. Its purpose \
is to test how the functions in the "storage" module evict data from local storage when the quota for local storage \
size is exceeded. The local storage quota is set to five thousand in this test environment, which is much smaller \
than most browsers will provide. At one thousand two hundred and thirty-four characters, this string represents a \
little less than a quarter of the total size of local storage in this test environment. Therefore, the tests below \
can reliably predict that up to three objects containing this string in one of its properties will fit in local \
storage, and that inserting a fourth one will trigger an eviction. They can also predict that a single object \
containing four or more copies of this string will not be allowed in local storage at all. This is slightly imprecise \
because adding items to local storage using the functions tested in this module incurs some additional storage \
penalties for the storage key, the stringified JSON surrounding the value, and the key and value of the \
least-recently-used queue. The size of local storage in this test environment is set in jest.config.js.\
`;

const LARGE_ENTRY = { data: LONG_STRING };

describe("writeMetadata/readStoredMetadata", () => {
  it("writes metadata records to local storage", () => {
    writeMetadata({
      foo: { foo: "bar" },
      bar: { bar: "foo" },
    });
    expect(readStoredMetadata(["bar", "foo"])).toEqual([{ bar: "foo" }, { foo: "bar" }]);
  });

  it("handles metadata keys that contain commas", () => {
    writeMetadata({
      "foo,bar": { a: 1, b: 2 },
      baz: { three: "eight" },
      "bar,foo": { c: 3, d: 4 },
    });
    expect(readStoredMetadata(["baz", "foo,bar"])).toEqual([{ three: "eight" }, { a: 1, b: 2 }]);
  });

  it("overwrites duplicate entries", () => {
    writeMetadata({
      foo: { numbers: [1, 2, 3] },
    });
    writeMetadata({
      foo: { numbers: [4, 5, 6] },
    });
    expect(readStoredMetadata(["foo"])).toEqual([{ numbers: [4, 5, 6] }]);
  });

  it("evicts least-recently used entries when storage runs out", () => {
    writeMetadata({ one: LARGE_ENTRY });
    writeMetadata({ two: LARGE_ENTRY, three: LARGE_ENTRY });
    expect(readStoredMetadata(["one", "two", "three"])).toEqual([LARGE_ENTRY, LARGE_ENTRY, LARGE_ENTRY]);
    writeMetadata({ four: LARGE_ENTRY });
    expect(readStoredMetadata(["one", "two", "three", "four"])).toEqual([
      undefined,
      LARGE_ENTRY,
      LARGE_ENTRY,
      LARGE_ENTRY,
    ]);
  });

  it("leaves storage unchanged when a single entry is too large to fit in storage", () => {
    writeMetadata({
      one: { entrySize: "small" },
      two: { bigness: "not_too_large" },
    });
    writeMetadata({
      three: { favoriteNumber: 8 },
      big: { one: LONG_STRING, two: LONG_STRING, three: LONG_STRING, four: LONG_STRING },
    });
    expect(readStoredMetadata(["one", "two", "three", "big"])).toEqual([
      { entrySize: "small" },
      { bigness: "not_too_large" },
      { favoriteNumber: 8 },
      undefined,
    ]);
  });

  it("moves entries to the front of the queue when read", () => {
    writeMetadata({ one: LARGE_ENTRY });
    writeMetadata({ two: LARGE_ENTRY, three: LARGE_ENTRY });
    readStoredMetadata(["one"]);
    writeMetadata({ four: LARGE_ENTRY, five: LARGE_ENTRY });
    expect(readStoredMetadata(["one", "two", "three", "four", "five"])).toEqual([
      LARGE_ENTRY,
      undefined,
      undefined,
      LARGE_ENTRY,
      LARGE_ENTRY,
    ]);
  });

  it("moves entries to the front of the queue when overwritten", () => {
    writeMetadata({ one: LARGE_ENTRY, two: LARGE_ENTRY });
    writeMetadata({ three: LARGE_ENTRY, one: LARGE_ENTRY });
    writeMetadata({ four: LARGE_ENTRY });
    expect(readStoredMetadata(["one", "two", "three", "four"])).toEqual([
      LARGE_ENTRY,
      undefined,
      LARGE_ENTRY,
      LARGE_ENTRY,
    ]);
  });

  it("returns `false` on an attempt to write more data than local storage can hold", () => {
    const fits = writeMetadata({ one: LARGE_ENTRY, two: LARGE_ENTRY, three: LARGE_ENTRY });
    expect(fits).toBe(true);
    const tooBig = writeMetadata({ big: { one: LONG_STRING, two: LONG_STRING, four: LONG_STRING, six: LONG_STRING } });
    expect(tooBig).toBe(false);
    const tooMany = writeMetadata({ one: LARGE_ENTRY, two: LARGE_ENTRY, three: LARGE_ENTRY, four: LARGE_ENTRY });
    expect(tooMany).toBe(false);
  });

  it("returns `undefined` on an attempt to get an array key", () => {
    writeMetadata({ one: { digits: 1 }, "one,two": { digits: 12 } });
    expect(readStoredMetadata(["one", "one,two", ["one", "two"]])).toEqual([{ digits: 1 }, { digits: 12 }, undefined]);
  });
});

describe("writeScenes/readStoredScenes", () => {
  const EXAMPLE_URL = "https://example.com/image.zarr";
  const EXAMPLE_URL_2 = "https://example.com/image2.zarr";

  it("writes keyed URLs to local storage", () => {
    writeScenes("foo", EXAMPLE_URL);
    expect(readStoredScenes("foo")).toBe(EXAMPLE_URL);
  });

  it("handles keys that contain commas", () => {
    writeScenes("foo,bar", EXAMPLE_URL);
    expect(readStoredScenes("foo,bar")).toBe(EXAMPLE_URL);
  });

  it("overwrites duplicate entries", () => {
    writeScenes("foo", EXAMPLE_URL);
    writeScenes("foo", EXAMPLE_URL_2);
    expect(readStoredScenes("foo")).toBe(EXAMPLE_URL_2);
  });

  it("evicts least-recently used entries when storage runs out", () => {
    writeScenes("one", LONG_STRING);
    writeScenes("two", LONG_STRING);
    writeScenes("three", LONG_STRING);
    writeScenes("four", LONG_STRING);
    expect(readStoredScenes("one")).toBe(undefined);
    expect(readStoredScenes("two")).toBe(LONG_STRING);
    expect(readStoredScenes("three")).toBe(LONG_STRING);
    expect(readStoredScenes("four")).toBe(LONG_STRING);
  });

  it("shares an eviction queue with metadata", () => {
    writeMetadata({ one: LARGE_ENTRY });
    writeScenes("one", LONG_STRING);
    writeMetadata({ two: LARGE_ENTRY });
    writeScenes("two", LONG_STRING);
    expect(readStoredScenes("one")).toBe(LONG_STRING);
    expect(readStoredMetadata(["one", "two"])).toEqual([undefined, LARGE_ENTRY]);
    expect(readStoredScenes("two")).toBe(LONG_STRING);
    writeMetadata({ three: LARGE_ENTRY });
    expect(readStoredMetadata(["one", "two", "three"])).toEqual([undefined, LARGE_ENTRY, LARGE_ENTRY]);
    expect(readStoredScenes("one")).toBe(undefined);
    expect(readStoredScenes("two")).toBe(LONG_STRING);
  });

  it("moves entries to the front of the queue when read", () => {
    const LARGE_ENTRY = { data: LONG_STRING };
    writeScenes("one", LONG_STRING);
    writeMetadata({ one: LARGE_ENTRY });
    readStoredScenes("one");
    writeMetadata({ two: LARGE_ENTRY, three: LARGE_ENTRY });
    expect(readStoredScenes("one")).toBe(LONG_STRING);
    expect(readStoredMetadata(["one", "two", "three"])).toEqual([undefined, LARGE_ENTRY, LARGE_ENTRY]);
  });

  it("moves entries to the front of the queue when overwritten", () => {
    writeScenes("one", LONG_STRING);
    writeMetadata({ two: LARGE_ENTRY });
    writeMetadata({ three: LARGE_ENTRY });
    writeScenes("one", LONG_STRING);
    writeMetadata({ four: LARGE_ENTRY });
    expect(readStoredScenes("one")).toBe(LONG_STRING);
    expect(readStoredMetadata(["two", "three", "four"])).toEqual([undefined, LARGE_ENTRY, LARGE_ENTRY]);
  });

  it("returns `false` on an attempt to write a longer scene url than local storage can hold", () => {
    expect(writeScenes("fits", LONG_STRING)).toBe(true);
    expect(writeScenes("does_not_fit", LONG_STRING + LONG_STRING + LONG_STRING + LONG_STRING)).toBe(false);
  });

  it("enforces a maximum number of scene entries", () => {
    const MAX_ENTRIES = 25;
    const EXTRA_ENTRIES = 5;

    const entriesToInsert = MAX_ENTRIES + EXTRA_ENTRIES;
    for (let i = 0; i < entriesToInsert; i++) {
      writeScenes(`scene${i}`, EXAMPLE_URL);
    }
    for (let i = 0; i < EXTRA_ENTRIES; i++) {
      expect(readStoredScenes(`scene${i}`)).toBe(undefined);
    }
    for (let i = EXTRA_ENTRIES; i < entriesToInsert; i++) {
      expect(readStoredScenes(`scene${i}`)).toBe(EXAMPLE_URL);
    }
  });
});
