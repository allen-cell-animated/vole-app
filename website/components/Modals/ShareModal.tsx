import { View3d } from "@aics/vole-core";
import { ShareAltOutlined } from "@ant-design/icons";
import { Button, Input, Modal, notification } from "antd";
import React, { useRef, useState } from "react";
import styled from "styled-components";
import { useShallow } from "zustand/shallow";

import { MultisceneUrls } from "../../../src/aics-image-viewer/components/App/types";
import { selectViewerSettings, useViewerState, ViewerStore } from "../../../src/aics-image-viewer/state/store";
import { AppDataProps } from "../../types";
import { ENCODED_COLON_REGEX, ENCODED_COMMA_REGEX, serializeViewerUrlParams } from "../../utils/url_utils";
import { FlexRow } from "../LandingPage/utils";

type ShareModalProps = {
  appProps: AppDataProps;
  // Used to retrieve the current camera position information
  view3dRef?: React.RefObject<View3d | null>;
};

const ModalContainer = styled.div``;

const ShareModal: React.FC<ShareModalProps> = (props: ShareModalProps) => {
  const selectViewerSettingsShallow = useShallow(selectViewerSettings);
  const selectChannelSettingsShallow = useShallow((store: ViewerStore) => store.channelSettings);

  const viewerSettings = useViewerState(selectViewerSettingsShallow);
  const channelSettings = useViewerState(selectChannelSettingsShallow);

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

export default ShareModal;
