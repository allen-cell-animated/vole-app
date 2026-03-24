import type { View3d } from "@aics/vole-core";
import { ExclamationCircleOutlined, ShareAltOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal, notification } from "antd";
import React, { useRef, useState } from "react";
import styled from "styled-components";
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

const ModalContainer = styled.div`
  .ant-alert {
    align-items: flex-start;
    margin-top: 12px;
    transition-property: all;
    color: var(--color-message-warning-text);
  }

  .ant-alert-motion-leave {
    margin-top: 0;
  }

  .ant-alert button,
  .ant-alert button .anticon {
    color: var(--color-message-warning-text);
  }

  .ant-alert button .anticon {
    font-size: 14px;
  }

  .ant-alert > .anticon {
    font-size: 21px;
  }
`;

const MAX_SCENE_URL_COUNT = 4;

const encodeSceneUrl = (scene: string | string[]): string => {
  if (Array.isArray(scene)) {
    return scene.map((url) => encodeURIComponent(url)).join(",");
  } else {
    return encodeURIComponent(scene);
  }
};

const Warning: React.FC<React.PropsWithChildren<{ message: React.ReactNode }>> = ({ message, children }) => {
  const [showDetails, setShowDetails] = useState(false);

  const warningContents = (
    <>
      <div>{message}</div>
      {showDetails && <div style={{ margin: "8px 0" }}>{children}</div>}
      <Button
        type="text"
        style={{ textDecoration: "underline", fontWeight: "bold", lineHeight: 0.8 }}
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? "Show less" : "Show more"}
      </Button>
    </>
  );

  return <Alert showIcon closable icon={<ExclamationCircleOutlined />} type="warning" message={warningContents} />;
};

const ShareModal: React.FC<ShareModalProps> = (props: ShareModalProps) => {
  const viewerSettings = useViewerState(useShallow(selectViewerSettings));
  const channelSettings = useViewerState(useShallow((store: ViewerStore) => store.channelSettings));

  const [showModal, setShowModal] = useState(false);
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

    if (hasTooManyScenes) {
      paramProps.scene = 0;
    }

    const serializedUrl = hasTooManyScenes
      ? encodeSceneUrl(urls[viewerSettings.scene])
      : urls.map(encodeSceneUrl).join("+");

    urlParams.push(`url=${serializedUrl}`);
  }

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
    <ModalContainer ref={modalContainerRef}>
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
        {hasTooManyScenes && (
          <Warning message="Only the current scene will be shared.">
            Vol-E has more scenes open than can fit in a single sharing link, so the URL above only includes the current
            scene.
          </Warning>
        )}
        {hasStoredMetadata && (
          <Warning message="Not all image metadata will be shared.">
            One or more open images has metadata that was shared with Vol-E by an external application (like BioFile
            Finder). This metadata can&apos;t be included in the URL above.
          </Warning>
        )}
      </Modal>
    </ModalContainer>
  );
};

export default ShareModal;
