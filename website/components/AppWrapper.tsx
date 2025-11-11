import type { View3d } from "@aics/vole-core";
import type { FirebaseFirestore } from "@firebase/firestore-types";
import React, { type ReactElement, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { ImageViewerApp, parseViewerUrlParams, type ViewerState, ViewerStateProvider } from "../../src";
import { getDefaultViewerChannelSettings } from "../../src/aics-image-viewer/shared/constants";
import type { AppDataProps } from "../types";
import { encodeImageUrlProp } from "../utils/urls";
import { FlexRowAlignCenter } from "./LandingPage/utils";

import { useErrorAlert } from "../../src/aics-image-viewer/components/ErrorAlert";
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

type AppWrapperProps = {
  firestore?: FirebaseFirestore;
};

/**
 * Wrapper around the main ImageViewer component. Handles the collection of parameters from the
 * URL and location state (from routing) to pass to the viewer.
 */
export default function AppWrapper(props: AppWrapperProps): ReactElement {
  const location = useLocation();
  const navigation = useNavigate();

  const view3dRef = React.useRef<View3d | null>(null);
  const [viewerSettings, setViewerSettings] = useState<Partial<ViewerState>>({});
  const [viewerProps, setViewerProps] = useState<AppDataProps | null>(null);
  const [imageTitle, setImageTitle] = useState<string | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const [errorAlert, showErrorAlert] = useErrorAlert();

  useEffect(() => {
    // On load, fetch parameters from the URL and location state, then merge.
    const locationArgs = location.state as AppDataProps;
    parseViewerUrlParams(searchParams, props.firestore).then(
      ({ args: urlArgs, viewerSettings: urlViewerSettings }) => {
        setViewerSettings({ ...urlViewerSettings, ...locationArgs?.viewerSettings });
        setViewerProps({ ...DEFAULT_APP_PROPS, ...urlArgs, ...locationArgs });
      },
      (reason) => {
        showErrorAlert("Failed to parse URL parameters: " + reason);
        setViewerSettings({});
        setViewerProps({ ...DEFAULT_APP_PROPS, ...locationArgs });
      }
    );
  }, [location.state, searchParams, showErrorAlert, props.firestore]);

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

  const onImageTitleChange = useCallback(
    (title: string | undefined) => {
      if (!searchParams.get("hideTitle")) {
        setImageTitle(title);
        document.title = title ? `Vol-E — ${title}` : "Vol-E";
      }
    },
    [setImageTitle, searchParams]
  );

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
      {errorAlert}
      <ViewerStateProvider viewerSettings={viewerSettings}>
        <Header title={imageTitle} noNavigate>
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
            showError={showErrorAlert}
            onImageTitleChange={onImageTitleChange}
          />
        )}
      </ViewerStateProvider>
    </div>
  );
}
