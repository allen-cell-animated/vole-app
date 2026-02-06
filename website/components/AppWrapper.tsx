import type { View3d } from "@aics/vole-core";
import type { FirebaseFirestore } from "@firebase/firestore-types";
import { isEqual } from "lodash";
import React, { type ReactElement, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import {
  addViewerParamsFromMessage,
  ImageViewerApp,
  parseViewerUrlParams,
  writeMetadata,
  writeScenes,
} from "../../src";
import { getDefaultViewerChannelSettings } from "../../src/aics-image-viewer/shared/constants";
import { select, useViewerState } from "../../src/aics-image-viewer/state/store";
import type { ViewerState } from "../../src/aics-image-viewer/state/types";
import type { AppDataProps } from "../types";
import { encodeImageUrlProp } from "../utils/urls";
import { FlexRowAlignCenter } from "./LandingPage/utils";

import { type ErrorAlertDescription, useErrorAlert } from "../../src/aics-image-viewer/components/ErrorAlert";
import Header, { HEADER_HEIGHT_PX } from "./Header";
import HelpDropdown from "./HelpDropdown";
import LoadModal from "./Modals/LoadModal";
import ShareModal from "./Modals/ShareModal";

const MSG_ORIGIN_PARAM = "msgorigin";
const COLLECTION_ID_PARAM = "collectionid";

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

const TOO_MANY_SCENES_ERROR: ErrorAlertDescription = {
  title: "Too many scenes to fit in local storage",
  description: (
    <>
      An external application sent more image URLs than can fit in your browser&apos;s local storage. Reloading the page
      or returning later may cause your session to be lost.
    </>
  ),
};

const TOO_MUCH_METADATA_ERROR: ErrorAlertDescription = {
  title: "Received more metadata than can fit in local storage",
  description: (
    <>
      An external application sent more image metadata than can fit in your browser&apos;s local storage. Reloading the
      page or returning later may cause some data to be lost.
    </>
  ),
};

/**
 * Wrapper around the main ImageViewer component. Handles the collection of parameters from the
 * URL and location state (from routing) to pass to the viewer.
 */
export default function AppWrapper(props: AppWrapperProps): ReactElement {
  const location = useLocation();
  const navigation = useNavigate();

  const view3dRef = React.useRef<View3d | null>(null);
  const prevViewerSettingsRef = React.useRef<Partial<ViewerState> | undefined>(undefined);
  const mergeViewerSettings = useViewerState(select("mergeViewerSettings"));
  const [viewerProps, setViewerProps] = useState<AppDataProps | null>(null);
  const [imageTitle, setImageTitle] = useState<string | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [errorAlert, showErrorAlert] = useErrorAlert();

  useEffect(() => {
    // On load, fetch parameters from the URL and location state, then merge.
    const locationArgs = location.state as AppDataProps;
    let ignore = false;

    const getViewerStateFromSearchParams = async (): Promise<void> => {
      try {
        const urlArgs = await parseViewerUrlParams(searchParams, props.firestore);
        if (ignore) return;
        setViewerProps({ ...DEFAULT_APP_PROPS, ...urlArgs.args, ...locationArgs });

        const viewerSettings = { ...urlArgs.viewerSettings, ...locationArgs?.viewerSettings };
        if (viewerSettings && !isEqual(viewerSettings, prevViewerSettingsRef.current)) {
          mergeViewerSettings(viewerSettings);
          prevViewerSettingsRef.current = viewerSettings;
        }
      } catch (reason) {
        if (ignore) return;
        showErrorAlert("Failed to parse URL parameters: " + reason);
        setViewerProps({ ...DEFAULT_APP_PROPS, ...locationArgs });
      }
    };

    // Handle the opening window wanting to send more data via a message
    const msgorigin = searchParams.get(MSG_ORIGIN_PARAM);

    if (msgorigin !== null) {
      const receiveMessage = (event: MessageEvent): void => {
        if (event.origin !== msgorigin) {
          return;
        }

        const metaFit = event.data.meta === undefined || writeMetadata(event.data.meta);

        let scenesFit = true;
        if (event.data.scenes !== undefined) {
          const collectionid = uuidv4();
          scenesFit = writeScenes(collectionid, encodeImageUrlProp(event.data));
          searchParams.set(COLLECTION_ID_PARAM, collectionid);
        }

        if (!scenesFit) {
          showErrorAlert(TOO_MANY_SCENES_ERROR);
        } else if (!metaFit) {
          showErrorAlert(TOO_MUCH_METADATA_ERROR);
        }

        if (event.data.sceneIndex !== undefined) {
          mergeViewerSettings({ scene: event.data.sceneIndex });
          searchParams.set("scene", event.data.sceneIndex);
        }

        setViewerProps((currentProps) => {
          if (currentProps === null) {
            return null;
          }
          return addViewerParamsFromMessage(currentProps, event.data);
        });

        searchParams.delete(MSG_ORIGIN_PARAM);
        setSearchParams(searchParams, { replace: true });

        window.removeEventListener("message", receiveMessage);
      };

      window.addEventListener("message", receiveMessage);
      window.setTimeout(() => window.removeEventListener("message", receiveMessage), 60000);
      // Sending a message back lets the opening window know we're ready to receive more data
      const msg = {
        appInfo: { name: "Vol-E", version: VOLEAPP_VERSION, coreVersion: VOLECORE_VERSION },
      };
      (window.opener as Window | null)?.postMessage(msg, msgorigin);
    }

    getViewerStateFromSearchParams();
    return () => {
      ignore = true;
    };
  }, [location.state, searchParams, setSearchParams, mergeViewerSettings, showErrorAlert, props.firestore]);

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
    </div>
  );
}
