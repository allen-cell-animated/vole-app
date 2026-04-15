import type { View3d } from "@aics/vole-core";
import { InfoCircleOutlined, ShareAltOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Modal, notification, Radio } from "antd";
import React, { useMemo, useRef, useState } from "react";
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
  imageTitle?: string;
  // Used to retrieve the current camera position information
  view3dRef?: React.RefObject<View3d | null>;
};

const MAX_URL_CHARACTERS = 2000;

const ModalContainer = styled.div`
  .ant-alert {
    margin-top: 12px;
    padding: 10px 14px;
    color: var(--color-alert-info-text);
    border: none;
  }

  .ant-alert > .anticon {
    font-size: 21px;
  }
`;

const encodeSceneUrl = (scene: string | string[]): string => {
  if (Array.isArray(scene)) {
    return scene.map((url) => encodeURIComponent(url)).join(",");
  } else {
    return encodeURIComponent(scene);
  }
};

const ShareModal: React.FC<ShareModalProps> = (props: ShareModalProps) => {
  const { imageUrl } = props.appProps;
  const urls = useMemo(
    () => (imageUrl !== undefined ? ((imageUrl as MultisceneUrls).scenes ?? [imageUrl]) : []),
    [imageUrl]
  );
  const hasStoredMetadata = useMemo(() => readStoredMetadata(urls).some((meta) => meta !== undefined), [urls]);

  const viewerSettings = useViewerState(useShallow(selectViewerSettings));
  const channelSettings = useViewerState(useShallow((store: ViewerStore) => store.channelSettings));

  const [showModal, setShowModal] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const [showAllScenes, setShowAllScenes] = useState(false);

  const [notificationApi, notificationContextHolder] = notification.useNotification({
    getContainer: modalContainerRef.current ? () => modalContainerRef.current! : undefined,
    placement: "bottomLeft",
    duration: 2,
  });

  const paramProps = {
    ...viewerSettings,
    scene: showAllScenes ? viewerSettings.scene : 0,
    channelSettings,
    cameraState: props.view3dRef?.current?.getCameraState(),
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

  // location.pathname will include up to `.../viewer`
  const baseUrl = location.protocol + "//" + location.host + location.pathname;

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
        {urls.length > 1 && (
          <Radio.Group
            value={showAllScenes}
            onChange={(e) => setShowAllScenes(e.target.value)}
            options={[
              {
                value: false,
                label: props.imageTitle !== undefined ? `Current scene (${props.imageTitle})` : "Current scene",
              },
              {
                value: true,
                label: "All scenes",
              },
            ]}
          />
        )}
        <FlexRow $gap={8} style={{ marginTop: "12px" }}>
          <Input value={shareUrl} readOnly={true}></Input>
          <Button type="primary" onClick={onClickCopy}>
            Copy URL
          </Button>
        </FlexRow>
        {hasStoredMetadata && (
          <Alert
            showIcon
            icon={<InfoCircleOutlined />}
            type="info"
            message="Image metadata from external apps (like BFF) can't be shared."
          />
        )}
        {shareUrl.length > MAX_URL_CHARACTERS && (
          <Alert
            showIcon
            icon={<InfoCircleOutlined />}
            type="info"
            message={`This URL is very long.${showAllScenes ? " Consider sharing only the current scene." : ""}`}
          />
        )}
      </Modal>
    </ModalContainer>
  );
};

export default ShareModal;
