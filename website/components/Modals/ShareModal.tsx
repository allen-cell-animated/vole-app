import type { View3d } from "@aics/vole-core";
import { ExclamationCircleFilled, ShareAltOutlined } from "@ant-design/icons";
import { Button, Card, Input, Modal, notification } from "antd";
import React, { useRef, useState } from "react";
import { useShallow } from "zustand/shallow";

import type { MultisceneUrls } from "../../../src/aics-image-viewer/components/App/types";
import { readStoredMetadata } from "../../../src/aics-image-viewer/shared/utils/storage";
import {
  ENCODED_COLON_REGEX,
  ENCODED_COMMA_REGEX,
  serializeViewerUrlParams,
} from "../../../src/aics-image-viewer/shared/utils/urlParsing";
import { selectViewerSettings, useViewerState, type ViewerStore } from "../../../src/aics-image-viewer/state/store";
import type { AppDataProps } from "../../types";
import { FlexRow } from "../LandingPage/utils";

type ShareModalProps = {
  appProps: AppDataProps;
  // Used to retrieve the current camera position information
  view3dRef?: React.RefObject<View3d | null>;
};

const MAX_SCENE_URL_COUNT = 4;

const WARNING_STYLE = {
  marginTop: "12px",
  borderColor: "#d89614",
  backgroundColor: "#59421430",
};

const encodeSceneUrl = (scene: string | string[]): string => {
  if (Array.isArray(scene)) {
    return scene.map((url) => encodeURIComponent(url)).join(",");
  } else {
    return encodeURIComponent(scene);
  }
};

const ShareModal: React.FC<ShareModalProps> = (props: ShareModalProps) => {
  const viewerSettings = useViewerState(useShallow(selectViewerSettings));
  const channelSettings = useViewerState(useShallow((store: ViewerStore) => store.channelSettings));

  const [showModal, setShowModal] = useState(false);
  const [showWarningDetails, setShowWarningDetails] = useState(false);
  const toggleWarningDetails = (): void => setShowWarningDetails(!showWarningDetails);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const [notificationApi, notificationContextHolder] = notification.useNotification({
    getContainer: modalContainerRef.current ? () => modalContainerRef.current! : undefined,
    placement: "bottomLeft",
    duration: 2,
  });

  // location.pathname will include up to `.../viewer`
  const baseUrl = location.protocol + "//" + location.host + location.pathname;
  const paramProps = {
    ...viewerSettings,
    channelSettings,
    cameraState: props.view3dRef?.current?.getCameraState(),
  };

  const urlParams: string[] = [];
  const { imageUrl } = props.appProps;
  let hasTooManyScenes = false;
  let hasStoredMetadata = false;

  if (imageUrl) {
    const urls = (imageUrl as MultisceneUrls).scenes ?? [imageUrl];
    hasTooManyScenes = urls.length > MAX_SCENE_URL_COUNT;
    hasStoredMetadata = readStoredMetadata(urls).some((meta) => meta !== undefined);
    const serializedUrl = hasTooManyScenes
      ? encodeSceneUrl(urls[viewerSettings.scene])
      : urls.map(encodeSceneUrl).join("+");

    urlParams.push(`url=${serializedUrl}`);
  }

  const warning = hasTooManyScenes
    ? "Only the current scene will be shared"
    : hasStoredMetadata
      ? "Not all image metadata will be shared"
      : undefined;

  let serializedViewerParams = new URLSearchParams(serializeViewerUrlParams(paramProps) as Record<string, string>);
  if (serializedViewerParams.size > 0) {
    // Decode specifically colons and commas for better readability + decreased char count
    let viewerParamString = serializedViewerParams
      .toString()
      .replace(ENCODED_COLON_REGEX, ":")
      .replace(ENCODED_COMMA_REGEX, ",");
    urlParams.push(viewerParamString);
  }

  const shareUrl = urlParams.length > 0 ? `${baseUrl}?${urlParams.join("&")}` : baseUrl;

  const onClickCopy = (): void => {
    navigator.clipboard.writeText(shareUrl);
    notificationApi.success({
      message: "URL copied",
    });
  };

  return (
    <div ref={modalContainerRef}>
      {notificationContextHolder}

      <Button type="link" onClick={() => setShowModal(!showModal)}>
        <ShareAltOutlined />
        Share
      </Button>
      <Modal
        open={showModal}
        title={"Share URL"}
        onCancel={() => {
          setShowModal(false);
        }}
        getContainer={modalContainerRef.current || undefined}
        destroyOnClose={true}
        footer={null}
      >
        <FlexRow $gap={8} style={{ marginTop: "12px" }}>
          <Input value={shareUrl} readOnly={true}></Input>
          <Button type="primary" onClick={onClickCopy}>
            Copy URL
          </Button>
        </FlexRow>
        {warning !== undefined && (
          <Card size="small" style={WARNING_STYLE}>
            <ExclamationCircleFilled style={{ color: "#d89614", marginRight: 8 }} />
            {warning} (
            <Button type="text" style={{ fontWeight: "bold" }} onClick={toggleWarningDetails}>
              {showWarningDetails ? "less info" : "more info"}
            </Button>
            )
            {showWarningDetails && (
              <ul>
                {hasTooManyScenes && (
                  <li>
                    Vol-E has more scenes open than can fit in a single sharing link, so the URL above only includes the
                    current scene.
                  </li>
                )}
                {hasStoredMetadata && (
                  <li>
                    One or more open images has metadata that was shared with Vol-E by an external application (like
                    BioFile Finder). This metadata can&apos;t be included in the URL above.
                  </li>
                )}
              </ul>
            )}
          </Card>
        )}
      </Modal>
    </div>
  );
};

export default ShareModal;
