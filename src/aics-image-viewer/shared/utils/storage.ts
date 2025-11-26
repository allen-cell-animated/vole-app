import { mapValues } from "lodash";

import type { MetadataRecord } from "../types";

const QUEUE_KEY = "GLOBAL_ENTRY_QUEUE";

const MAX_ENTRIES = {
  scenes: 25,
  meta: 1000,
};

type StorageEntryType = keyof typeof MAX_ENTRIES;

/**
 * Wrapper for `window.localStorage.setItem` that accepts a `queue` of evictable storage keys, and attempts to safely
 * handle exceeding the storage quota by removing items off the back of the `queue` until space is available.
 *
 * Also, unlike `setItem`, this function can accept `value`s of type `string[]`. This allows `queue` to also be passed
 * into `value`, so that it can be written to storage *after* picking up any evictions that are made during the write.
 */
function setStorageItem(key: string, value: string | string[], queue: string[]): void {
  let success = false;
  while (!success) {
    try {
      window.localStorage.setItem(key, Array.isArray(value) ? value.join(",") : value);
      success = true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        const evictKey = queue.shift();
        if (evictKey === undefined) {
          const err = new Error("Tried to insert a single entry into local storage that was larger than the quota.");
          err.cause = e;
          throw err;
        }
        window.localStorage.removeItem(evictKey);
      } else {
        throw e;
      }
    }
  }
}

const getStorageQueue = (): string[] => window.localStorage.getItem(QUEUE_KEY)?.split(",") ?? [];
const setStorageQueue = (queue: string[]): void => setStorageItem(QUEUE_KEY, queue, queue);

/**
 * Writes a bundle of `entries` to local storage, all with an optional `entryType` for categorizing the data.
 *
 * Entries written with this function are tracked like a least-recently-used cache, and evicted when either:
 * - the size of local storage exceeds the browser's quota
 * - the number of entries of type `entryType` exceeds the maximum for that type
 */
function writeStorage(entries: Record<string, string>, entryType?: StorageEntryType): void {
  const prevQueue = getStorageQueue();
  const typePrefix = entryType ? `${entryType}@` : "";

  // filter keys we're currently inserting out of the queue (to be re-inserted at the front)
  let index = 0;
  const thisTypeIndexes: number[] = [];
  const queue = prevQueue.filter((k) => {
    if (k.startsWith(typePrefix)) {
      if (k.slice(typePrefix.length) in entries) {
        return false;
      } else if (entryType !== undefined) {
        // save entries we don't have
        thisTypeIndexes.push(index);
      }
    }

    index += 1;
    return true;
  });

  // push new keys onto the end
  for (const key of Object.keys(entries)) {
    if (key.indexOf(",") !== -1) {
      throw new Error(`Cannot write to local storage at key "${key}": keys may not contain commas.`);
    }
    thisTypeIndexes.push(queue.length);
    queue.push(typePrefix + key);
  }

  // enforce the maximum number of entries for this type (e.g. no more than 25 of type "scenes")
  if (entryType !== undefined) {
    const evictIndexes = thisTypeIndexes.slice(0, -MAX_ENTRIES[entryType]);
    for (const index of evictIndexes.reverse()) {
      let [evictKey] = queue.splice(index, 1);
      window.localStorage.removeItem(evictKey);
      delete entries[evictKey.slice(typePrefix.length)];
    }
  }

  // write the new entries
  for (const [key, value] of Object.entries(entries)) {
    setStorageItem(typePrefix + key, value, queue);
  }
  setStorageQueue(queue);
}

function readStorage(key: string, entryType?: StorageEntryType): any {
  const globalKey = entryType ? `${entryType}@${key}` : key;
  const result = window.localStorage.getItem(globalKey);

  if (result === undefined) {
    return undefined;
  }

  const queue = getStorageQueue();
  const entryIndex = queue.indexOf(globalKey);
  if (entryIndex !== -1) {
    queue.splice(entryIndex, 1);
  }
  queue.push(globalKey);
  setStorageQueue(queue);

  return result;
}

export function writeMetadata(meta: Record<string, MetadataRecord>): void {
  const stringMeta = mapValues(meta, (metaVal) => JSON.stringify(metaVal));
  writeStorage(stringMeta, "meta");
}

export function writeScenes(key: string, url: string): void {
  writeStorage({ [key]: url }, "scenes");
}
