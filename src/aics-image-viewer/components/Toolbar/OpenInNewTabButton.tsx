import { View3d } from "@aics/vole-core";
import { ExportOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React, { ReactElement, useMemo } from "react";
import { useShallow } from "zustand/shallow";

import { paramsToViewerMessage } from "../../shared/utils/parseSnapshot";
import { serializeViewerUrlParams } from "../../shared/utils/parseUrl";
import { readStoredMetadata } from "../../shared/utils/storage";
import { selectViewerSettings, useViewerState, ViewerStore } from "../../state/store";
import { AppProps, MultisceneUrls } from "../App/types";

import ViewerIcon from "../shared/ViewerIcon";

type OpenInNewTabProps = {
  standaloneViewerHref?: string;
  appProps: AppProps;
  view3d: View3d;
};

const enum OpenInNewTabHtmlIds {}

const ENCODED_COLON_REGEX = /%3A/g;
const ENCODED_COMMA_REGEX = /%2C/g;

// TODO: currently copied from ShareModal
const encodeSceneUrl = (scene: string | string[]): string => {
  if (Array.isArray(scene)) {
    return scene.map((url) => encodeURIComponent(url)).join(",");
  } else {
    return encodeURIComponent(scene);
  }
};

export default function OpenInNewTabButton(props: OpenInNewTabProps): ReactElement {
  const windowProxyRef = React.useRef<Window | null>(null);

  const { imageUrl, metadata } = props.appProps;
  const urls = useMemo(
    () => (imageUrl !== undefined ? ((imageUrl as MultisceneUrls).scenes ?? [imageUrl]) : []),
    [imageUrl]
  );
  const hasStoredMetadata = useMemo(() => readStoredMetadata(urls).some((meta) => meta !== undefined), [urls]);

  const viewerSettings = useViewerState(useShallow(selectViewerSettings));
  const channelSettings = useViewerState(useShallow((store: ViewerStore) => store.channelSettings));

  const viewerUrl = props.standaloneViewerHref ?? "https://vole.allencell.org/viewer";
  const viewerOrigin = new URL(viewerUrl).origin;

  // TODO: Copied from ShareModal, DRY
  const getViewerUrl = (): string => {
    const paramProps = {
      ...viewerSettings,
      scene: 0,
      channelSettings,
      cameraState: props.view3d.getCameraState(),
    };

    const urlParams: string[] = [];
    const serializedUrl = encodeSceneUrl(urls[viewerSettings.scene]);

    urlParams.push(`url=${serializedUrl}`);
    let serializedViewerParams = new URLSearchParams(serializeViewerUrlParams(paramProps) as Record<string, string>);
    if (serializedViewerParams.size > 0) {
      // Decode specifically colons and commas for better readability + decreased char count
      let viewerParamString = serializedViewerParams
        .toString()
        .replace(ENCODED_COLON_REGEX, ":")
        .replace(ENCODED_COMMA_REGEX, ",");
      urlParams.push(viewerParamString);
    }
    // Include message origin so the opened window can have additioanl data sent
    const msOrigin = window.location.origin;
    urlParams.push(`msgorigin=${encodeURIComponent(msOrigin)}`);

    const url = `${viewerUrl}?${urlParams.join("&")}`;
    return url;
  };

  const onMessage = (event: MessageEvent) => {
    if (!windowProxyRef.current || event.source !== windowProxyRef.current) {
      return;
    }

    // Handle the message from the opened window
    const meta = Array.isArray(metadata) || metadata === undefined ? metadata : [metadata];

    console.log("Received message from opened window:", event.data);

    const message = { ...paramsToViewerMessage({ scenes: urls }, meta), sceneIndex: viewerSettings.scene };
    windowProxyRef.current.postMessage(message, viewerOrigin);

    // Clear window reference and remove event listener
    window.removeEventListener("message", onMessage);
    windowProxyRef.current = null;
  };

  const handleClick = () => {
    // Open viewer in a new tab
    const windowProxy = window.open(getViewerUrl());
    // Store window reference so metadata + scene information can be passed back
    windowProxyRef.current = windowProxy;
    window.addEventListener("message", onMessage);
  };

  return (
    <Tooltip placement="bottom" title="Open in new tab">
      <Button className="ant-btn-icon-only btn-borderless" onClick={handleClick}>
        <ViewerIcon type="openInNewTab" />
        {/* <ExportOutlined /> */}
      </Button>
    </Tooltip>
  );
}
