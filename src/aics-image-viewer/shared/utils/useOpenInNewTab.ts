import type { View3d } from "@aics/vole-core";
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";

import type { AppProps, MultisceneUrls } from "../../components/App/types";
import { selectViewerSettings, useViewerState, type ViewerStore } from "../../state/store";
import { paramsToViewerMessage } from "./parseSnapshot";
import { getDefaultBaseUrl, getShareLink } from "./sharing";

export default function useOpenInNewTab(
  standaloneViewerHref: string | undefined,
  appProps: AppProps,
  view3d: View3d
): () => void {
  const { imageUrl, metadata } = appProps;
  const urls = useMemo(
    () => (imageUrl !== undefined ? ((imageUrl as MultisceneUrls).scenes ?? [imageUrl]) : []),
    [imageUrl]
  );

  const viewerSettings = useViewerState(useShallow(selectViewerSettings));
  const channelSettings = useViewerState(useShallow((store: ViewerStore) => store.channelSettings));

  const viewerUrl = standaloneViewerHref ?? getDefaultBaseUrl();
  const viewerOrigin = new URL(viewerUrl).origin;

  const openInNewTab = useCallback(() => {
    let url = getShareLink(viewerUrl, appProps.imageUrl, viewerSettings, channelSettings, view3d ?? undefined, false);
    // Include message origin so the opened window can have additional metadata
    // + scene data sent
    const msOrigin = window.location.origin;
    url += `&msgorigin=${encodeURIComponent(msOrigin)}`;

    // Open viewer in a new tab
    const windowProxy = window.open(url);

    // Add listener for the return message (see
    // `documentation/EXTERNAL_APP_MESSAGE_SPEC.md` for details)
    const onMessage = (event: MessageEvent) => {
      if (!windowProxy || event.source !== windowProxy) {
        return;
      }

      // Send message with metadata + scene data
      const meta = Array.isArray(metadata) || metadata === undefined ? metadata : [metadata];
      const message = { ...paramsToViewerMessage({ scenes: urls }, meta), sceneIndex: viewerSettings.scene };
      windowProxy.postMessage(message, viewerOrigin);

      window.removeEventListener("message", onMessage);
    };

    window.addEventListener("message", onMessage);
  }, [viewerUrl, appProps.imageUrl, viewerSettings, channelSettings, view3d, metadata, urls]);

  return openInNewTab;
}
