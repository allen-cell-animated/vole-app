import { useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";

/** Key for local storage to read/write recently opened datasets */
const RECENT_DATASETS_STORAGE_KEY = "WEBSITE_3D_CELL_VIEWER.recentDatasets";
const MAX_RECENT_URLS = 100;

// Label and URL are stored separately, so if a user provides an input URL (the label) that is transformed into an absolute
// URL, we can check for duplicates using the absolute URL while still showing the user's input.
// This is more relevant in nucmorph, where we're resolving filepaths to absolute URLs, but it's useful functionality to bake in
// for future use.

export type RecentDataUrl = {
  /** The absolute URL path, post any transformation or remapping. Stored for comparison between urls. */
  url: string;
  /** The user input that was used to load the data. */
  label: string;
};

/**
 * Wrapper around locally-stored recent urls.
 * @returns an array containing the list of recent data urls and a function to add a new url to the list.
 */
export const useRecentDataUrls = (): [RecentDataUrl[], (newEntry: RecentDataUrl) => void] => {
  const [storedRecentEntries, setRecentEntries] = useLocalStorage<RecentDataUrl[]>(RECENT_DATASETS_STORAGE_KEY, []);

  // Sanitize/validate recent entries
  let recentEntries: RecentDataUrl[] = useMemo(
    () => storedRecentEntries.filter(({ url, label }) => typeof url === "string" && typeof label === "string"),
    [storedRecentEntries]
  );
  if (recentEntries.length !== storedRecentEntries.length) {
    setRecentEntries(recentEntries);
  }

  /** Adds a new URL entry (url + label) to the list of recent datasets. */
  const addRecentEntry = useCallback(
    (newEntry: RecentDataUrl): void => {
      if (recentEntries === null) {
        setRecentEntries([newEntry]);
        return;
      }

      // Find matches by absolute URL and move to front of the list if a match exists.
      const datasetIndex = recentEntries.findIndex(({ url }) => url === newEntry.url);
      if (datasetIndex === -1) {
        // New entry, add to front while maintaining max length
        setRecentEntries([newEntry as RecentDataUrl, ...recentEntries.slice(0, MAX_RECENT_URLS - 1)]);
      } else {
        // Move to front; this also updates the label if it changed.
        setRecentEntries([
          newEntry as RecentDataUrl,
          ...recentEntries.slice(0, datasetIndex),
          ...recentEntries.slice(datasetIndex + 1),
        ]);
      }
    },
    [recentEntries, setRecentEntries]
  );

  return [recentEntries || [], addRecentEntry];
};
