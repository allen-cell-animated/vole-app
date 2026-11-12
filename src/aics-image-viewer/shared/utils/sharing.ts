import type { View3d } from "@aics/vole-core";

import type { MultisceneUrls } from "../../components/App/types";
import type { ChannelState, ViewerState } from "../../state/types";
import { serializeViewerUrlParams } from "./parseUrl";

const ENCODED_COLON_REGEX = /%3A/g;
const ENCODED_COMMA_REGEX = /%2C/g;

export function encodeSceneUrl(scene: string | string[]): string {
  if (Array.isArray(scene)) {
    return scene.map((url) => encodeURIComponent(url)).join(",");
  } else {
    return encodeURIComponent(scene);
  }
}

/**
 * Returns the current base URL of the viewer, including the protocol, host, and
 * pathname.
 */
export function getDefaultBaseUrl(): string {
  // location.pathname will include up to `.../viewer`
  return location.protocol + "//" + location.host + location.pathname;
}

/**
 * Returns a shareable URL for the viewer with the specified settings and scene data.
 */
export function getShareLink(
  baseUrl: string,
  imageUrl: MultisceneUrls | string | undefined,
  viewerSettings: ViewerState,
  channelSettings: ChannelState[],
  view3d: View3d | undefined,
  showAllScenes: boolean = false
): string {
  const urls = imageUrl !== undefined ? ((imageUrl as MultisceneUrls).scenes ?? [imageUrl]) : [];

  const paramProps = {
    ...viewerSettings,
    scene: showAllScenes ? viewerSettings.scene : 0,
    channelSettings,
    cameraState: view3d?.getCameraState(),
  };

  const urlParams: string[] = [];

  const serializedUrl = showAllScenes ? urls.map(encodeSceneUrl).join("+") : encodeSceneUrl(urls[viewerSettings.scene]);

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

  return `${baseUrl}?${urlParams.join("&")}`;
}
