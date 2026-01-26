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

/** `window.localStorage.setItem`, but returns `false` on quota exceeded instead of erroring */
function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // `setItem` throws a `QuotaExceededError` when the browser won't let us put any more data in local storage
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      return false;
    }
    throw e;
  }
}

/**
 * Wrapper for `window.localStorage.setItem` that accepts a `queue` of evictable storage keys, and attempts to safely
 * handle exceeding the storage quota by removing items off the back of the `queue` until space is available.
 *
 * Also, unlike `setItem`, this function can accept `value`s of type `string[]`. This allows `queue` to also be passed
 * into `value`, so that it can be written to storage *after* picking up any evictions that are made during the write.
 *
 * Returns `false` if `value` could not fit into storage even after removing everything from `queue`, `true` otherwise.
 */
function setStorageItem(key: string, value: string | string[], queue: string[]): boolean {
  const removedItems: [string, string][] = [];

  while (!safeSetItem(key, Array.isArray(value) ? value.join(",") : value)) {
    // can't fit `value` in the store; remove something off the back of `queue` and try again
    const evictKey = queue.shift();

    if (evictKey === undefined) {
      // nothing left to remove means `value` is larger than the entire store
      // give up on inserting it and try to put everything we removed back
      for (const [key, value] of removedItems) {
        if (safeSetItem(key, value)) {
          queue.unshift(key);
        }
      }
      return false;
    }

    const removedValue = window.localStorage.getItem(evictKey);
    if (removedValue !== null) {
      removedItems.push([evictKey, removedValue]);
      window.localStorage.removeItem(evictKey);
    }
  }

  return true;
}

const getStorageQueue = (): string[] => window.localStorage.getItem(QUEUE_KEY)?.split(",") ?? [];
/** If this function returns `false`, something serious has gone wrong and using local storage is likely impossible. */
const setStorageQueue = (queue: string[]): boolean => setStorageItem(QUEUE_KEY, queue, queue);

/**
 * Writes a bundle of `entries` to local storage, all with an optional `entryType` for categorizing the data.
 *
 * Entries written with this function are tracked like a least-recently-used cache, and evicted when either:
 * - the size of local storage exceeds the browser's quota
 * - the number of entries of type `entryType` exceeds the maximum for that type
 *
 * Returns `true` if all entries fit in storage, or `false` if some did not.
 */
function writeStorage(entries: Record<string, string>, entryType?: StorageEntryType): boolean {
  const prevQueue = getStorageQueue();
  const typePrefix = entryType ? `${entryType}@` : "";
  const escapedEntries = mapKeys(entries, (_, key) => sanitizeStorageKey(key));

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
  const entryList = Object.entries(escapedEntries);
  const allEntriesFit = entryList.reduce((allFit, [key, value]) => {
    const entryFit = setStorageItem(typePrefix + key, value, queue);
    return allFit && entryFit;
  }, true);

  // TODO if the queue doesn't fit, it's a much more serious problem than an individual entry.
  //   Should that be communicated in the return type?
  const queueFit = setStorageQueue(queue);
  return allEntriesFit && queueFit;
}

/**
 * Writes a bundle of metadata records keyed by image URL to local storage.
 *
 * Returns `true` if all records fit into local storage, or `false` if at least one did not.
 */
export function writeMetadata(meta: Record<string, MetadataRecord>): boolean {
  const stringMeta = mapValues(meta, (metaVal) => JSON.stringify(metaVal));
  return writeStorage(stringMeta, StorageEntryType.Meta);
}

/**
 * Writes a scene `url` to local storage at the given `key`.
 *
 * Returns `false` if the entry did not fit in local storage, or `true` if it did.
 */
export function writeScenes(key: string, url: string): boolean {
  return writeStorage({ [key]: url }, StorageEntryType.Scenes);
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
