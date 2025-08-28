import { View3d } from "@aics/vole-core";
import { isEqual } from "lodash";
import React, { ReactElement, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { ImageViewerApp } from "../../src";
import type { ViewerState } from "../../src/aics-image-viewer/components/ViewerStateProvider/types";
import { getDefaultViewerChannelSettings } from "../../src/aics-image-viewer/shared/constants";
import { select, useViewerState } from "../../src/aics-image-viewer/state/store";
import type { AppDataProps } from "../types";
import { encodeImageUrlProp, parseViewerUrlParams } from "../utils/url_utils";
import { FlexRowAlignCenter } from "./LandingPage/utils";

import Header, { HEADER_HEIGHT_PX } from "./Header";
import HelpDropdown from "./HelpDropdown";
import LoadModal from "./Modals/LoadModal";
import ShareModal from "./Modals/ShareModal";

const DEFAULT_APP_PROPS: AppDataProps = {
  imageUrl: "",
  cellId: "",
  imageDownloadHref: "",
  parentImageDownloadHref: "",
  viewerChannelSettings: getDefaultViewerChannelSettings(),
};

/**
 * Wrapper around the main ImageViewer component. Handles the collection of parameters from the
 * URL and location state (from routing) to pass to the viewer.
 */
export default function AppWrapper(): ReactElement {
  const location = useLocation();
  const navigation = useNavigate();

  const view3dRef = React.useRef<View3d | null>(null);
  const prevViewerSettingsRef = React.useRef<Partial<ViewerState> | undefined>(undefined);
  const mergeViewerSettings = useViewerState(select("mergeViewerSettings"));
  const [viewerProps, setViewerProps] = useState<AppDataProps | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // On load, fetch parameters from the URL and location state, then merge.
    const locationArgs = location.state as AppDataProps;
    parseViewerUrlParams(searchParams).then(
      ({ args: urlArgs, viewerSettings: urlViewerSettings }) => {
        setViewerProps({ ...DEFAULT_APP_PROPS, ...urlArgs, ...locationArgs });

        const viewerSettings = { ...urlViewerSettings, ...locationArgs?.viewerSettings };
        if (viewerSettings && !isEqual(viewerSettings, prevViewerSettingsRef.current)) {
          mergeViewerSettings(viewerSettings);
          prevViewerSettingsRef.current = viewerSettings;
        }
      },
      (reason) => {
        console.warn("Failed to parse URL parameters: ", reason);
        setViewerProps({ ...DEFAULT_APP_PROPS, ...locationArgs });
      }
    );
  }, [location.state, searchParams, mergeViewerSettings]);

  // TODO: Disabled for now, since it only makes sense for Zarr/OME-tiff URLs. Checking for
  // validity may be more complex. (Also, we could add a callback to `ImageViewerApp` for successful
  // loading and only save the URL then.)
  //
  // Save recent zarr data urls
  // useEffect(() => {
  //   if (typeof viewerArgs.imageUrl === "string" && isValidZarrUrl(viewerArgs.imageUrl)) {
  //     // TODO: Handle case where there are multiple URLs?
  //     // TODO: Save ALL AppProps instead of only the URL? Ignore/handle rawData?
  //     addRecentDataUrl({ url: viewerArgs.imageUrl as string, label: viewerArgs.imageUrl as string });
  //   }
  // }, [viewerArgs]);

  const onLoad = (appProps: AppDataProps): void => {
    // Force a page reload when loading new data. This prevents a bug where a desync in the number
    // of channels in the viewer can cause a crash. The root cause is React immediately forcing a
    // re-render every time `setState` is called in an async function.
    navigation(`/viewer?url=${encodeImageUrlProp(appProps.imageUrl)}`, {
      state: appProps,
    });
    navigation(0);
  };

  return (
    <div>
      <Header noNavigate>
        <FlexRowAlignCenter $gap={12}>
          <FlexRowAlignCenter $gap={2}>
            <LoadModal onLoad={onLoad} />
            {viewerProps && <ShareModal appProps={viewerProps} view3dRef={view3dRef} />}
          </FlexRowAlignCenter>
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>
      {viewerProps && (
        <ImageViewerApp
          {...viewerProps}
          appHeight={`calc(100vh - ${HEADER_HEIGHT_PX}px)`}
          canvasMargin="0 0 0 0"
          view3dRef={view3dRef}
        />
      )}
    </div>
  );
}
