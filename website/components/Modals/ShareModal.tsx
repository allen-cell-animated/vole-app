import type { View3d } from "@aics/vole-core";
import { ShareAltOutlined } from "@ant-design/icons";
import { Button, Input, Modal, notification } from "antd";
import React, { useRef, useState } from "react";
import styled from "styled-components";

import type { MultisceneUrls } from "../../../src/aics-image-viewer/components/App/types";
import type { ViewerStateContextType } from "../../../src/aics-image-viewer/components/ViewerStateProvider/types";
import {
  ENCODED_COLON_REGEX,
  ENCODED_COMMA_REGEX,
  serializeViewerUrlParams,
} from "../../../src/aics-image-viewer/shared/utils/urlParsing";
import type { AppDataProps } from "../../types";
import { FlexRow } from "../LandingPage/utils";

import {
  ALL_VIEWER_STATE_KEYS,
  connectToViewerState,
} from "../../../src/aics-image-viewer/components/ViewerStateProvider";

type ShareModalProps = {
  appProps: AppDataProps;
  // Used to retrieve the current camera position information
  view3dRef?: React.RefObject<View3d | null>;
} & ViewerStateContextType;

const ModalContainer = styled.div``;

const ShareModal: React.FC<ShareModalProps> = (props: ShareModalProps) => {
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
    ...props,
    cameraState: props.view3dRef?.current?.getCameraState(),
  };

  const urlParams: string[] = [];
  const { imageUrl } = props.appProps;

  if (imageUrl) {
    const urls = (imageUrl as MultisceneUrls).scenes ?? [imageUrl];
    const serializedUrl = urls
      .map((scene) => {
        if (Array.isArray(scene)) {
          return scene.map((url) => encodeURIComponent(url)).join(",");
        } else {
          return encodeURIComponent(scene);
        }
      })
      .join("+");

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
        footer={
          <Button type="default" onClick={() => setShowModal(false)}>
            Close
          </Button>
        }
        destroyOnClose={true}
      >
        <FlexRow $gap={8} style={{ marginTop: "12px" }}>
          <Input value={shareUrl} readOnly={true}></Input>
          <Button type="primary" onClick={onClickCopy}>
            Copy URL
          </Button>
        </FlexRow>
      </Modal>
    </ModalContainer>
  );
};

export default connectToViewerState(ShareModal, ALL_VIEWER_STATE_KEYS);
