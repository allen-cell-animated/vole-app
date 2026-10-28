import type { View3d } from "@aics/vole-core";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";

import type { AppProps } from "../../components/App/types";
import { selectViewerSettings, useViewerState, type ViewerStore } from "../../state/store";
import { paramsToViewerMessage } from "./parseSnapshot";
import { getDefaultBaseUrl, getShareLink } from "./sharing";

/**
 * Returns a callback function that opens a new instance of the viewer in a new
 * tab, with the current viewer settings. Uses the spec defined in
 * `documentation/EXTERNAL_APP_MESSAGE_SPEC.md` to pass metadata and scenes data
 * that may be too large to pass via the URL alone.
 * @param standaloneViewerHref The URL of the standalone viewer to open in a new
 * tab. If not provided, uses the current page URL as the viewer URL.
 * @param appProps props of the viewer app.
 * @param view3d The 3D view instance.
 * @returns A callback function that opens the viewer in a new tab with the
 * current settings.
 */
export default function useOpenInNewTab(
  standaloneViewerHref: string | undefined,
  appProps: Pick<AppProps, "imageUrl" | "metadata">,
  view3d: View3d
): () => void {
  const { imageUrl, metadata } = appProps;
  const viewerSettings = useViewerState(useShallow(selectViewerSettings));
  const channelSettings = useViewerState(useShallow((store: ViewerStore) => store.channelSettings));

  const viewerUrl = standaloneViewerHref ?? getDefaultBaseUrl();
  const viewerOrigin = new URL(viewerUrl).origin;

  const openInNewTab = useCallback((): void => {
    // Get URL, add `msgorigin` so the opened window knows there is additional
    // metadata + scene data to be sent
    let url = getShareLink(viewerUrl, imageUrl, viewerSettings, channelSettings, view3d ?? undefined, false);
    const msOrigin = window.location.origin;
    url += `&msgorigin=${encodeURIComponent(msOrigin)}`;

    // Open viewer in a new tab
    const windowProxy = window.open(url);

    // Add listener for the return message (see
    // `documentation/EXTERNAL_APP_MESSAGE_SPEC.md` for details)
    const onMessage = (event: MessageEvent): void => {
      if (!windowProxy || event.source !== windowProxy) {
        return;
      }
      // Send message with metadata + scene data
      const meta = Array.isArray(metadata) || metadata === undefined ? metadata : [metadata];
      const message = { ...paramsToViewerMessage(imageUrl, meta), sceneIndex: viewerSettings.scene };
      windowProxy.postMessage(message, viewerOrigin);
      window.removeEventListener("message", onMessage);
    };
    window.addEventListener("message", onMessage);
  }, [viewerUrl, imageUrl, viewerSettings, channelSettings, view3d, viewerOrigin, metadata]);

  return openInNewTab;
}
