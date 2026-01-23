import { mapKeys, mapValues } from "lodash";

import type { MetadataRecord } from "../types";

const QUEUE_KEY = "GLOBAL_ENTRY_QUEUE";

const enum StorageEntryType {
  Scenes = "scenes",
  Meta = "meta",
}

const MAX_ENTRIES: { [K in StorageEntryType]: number } = {
  scenes: 25,
  meta: 1000,
};

const sanitizeStorageKey = (key: string): string => (key.includes(",") ? encodeURIComponent(key) : key);

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
  const escapedEntries = mapKeys(entries, sanitizeStorageKey);

  // filter keys we're currently inserting out of the queue (to be re-inserted at the front)
  let index = 0;
  const thisTypeIndexes: number[] = [];
  const queue = prevQueue.filter((k) => {
    if (k.startsWith(typePrefix)) {
      if (k.slice(typePrefix.length) in escapedEntries) {
        return false;
      } else if (entryType !== undefined) {
        // start saving the location of entries of this type, for enforcing the maximum entry count below
        thisTypeIndexes.push(index);
      }
    }

    index += 1;
    return true;
  });

  // push new keys onto the end
  for (const key of Object.keys(escapedEntries)) {
    thisTypeIndexes.push(queue.length);
    queue.push(typePrefix + key);
  }

  // enforce the maximum number of entries for this type (e.g. no more than 25 of type "scenes")
  if (entryType !== undefined) {
    const evictIndexes = thisTypeIndexes.slice(0, -MAX_ENTRIES[entryType]);
    for (const index of evictIndexes.reverse()) {
      let [evictKey] = queue.splice(index, 1);
      window.localStorage.removeItem(evictKey);
      delete escapedEntries[evictKey.slice(typePrefix.length)];
    }
  }

  // write the new entries
  for (const [key, value] of Object.entries(escapedEntries)) {
    setStorageItem(typePrefix + key, value, queue);
  }
  setStorageQueue(queue);
}

export function writeMetadata(meta: Record<string, MetadataRecord>): void {
  const stringMeta = mapValues(meta, (metaVal) => JSON.stringify(metaVal));
  writeStorage(stringMeta, StorageEntryType.Meta);
}

export function writeScenes(key: string, url: string): void {
  writeStorage({ [key]: url }, StorageEntryType.Scenes);
}

export function readStoredMetadata(
  scenes: (string | string[])[],
  skipCacheUpdate: boolean = false
): (MetadataRecord | undefined)[] {
  const keySet = new Set<string>();
  const result = scenes.map((scene) => {
    if (Array.isArray(scene)) {
      // can't handle multi-source scenes (yet)
      return undefined;
    }

    const globalKey = `${StorageEntryType.Meta}@${sanitizeStorageKey(scene)}`;
    const meta = window.localStorage.getItem(globalKey);
    if (meta === null) {
      return undefined;
    }

    keySet.add(globalKey);
    return JSON.parse(meta) as MetadataRecord;
  });

  if (keySet.size > 0 && !skipCacheUpdate) {
    const prevQueue = getStorageQueue();
    const queue = prevQueue.filter((key) => !keySet.has(key));
    queue.push(...keySet);
    setStorageQueue(queue);
  }

  return result;
}

export function readStoredScenes(key: string, skipCacheUpdate: boolean = false): string | undefined {
  const globalKey = `${StorageEntryType.Scenes}@${sanitizeStorageKey(key)}`;
  const result = window.localStorage.getItem(globalKey);

  if (result === null) {
    return undefined;
  }

  if (!skipCacheUpdate) {
    const queue = getStorageQueue();
    const entryIndex = queue.indexOf(globalKey);
    if (entryIndex !== -1) {
      queue.splice(entryIndex, 1);
    }
    queue.push(globalKey);
    setStorageQueue(queue);
  }

  return result;
}
