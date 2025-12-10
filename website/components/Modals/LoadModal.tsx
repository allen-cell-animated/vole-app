import { UploadOutlined } from "@ant-design/icons";
import { AutoComplete, Button, Modal } from "antd";
import Fuse from "fuse.js";
import React, { type ReactElement, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import type { AppDataProps } from "../../types";
import { type RecentDataUrl, useRecentDataUrls } from "../../utils/react_utils";
import { isValidUrl } from "../../utils/urls";
import { FlexRow } from "../LandingPage/utils";

import MiddleTruncatedText from "../MiddleTruncatedText";

const MAX_RECENT_URLS_TO_DISPLAY = 20;

type LoadModalProps = {
  onLoad: (appProps: AppDataProps) => void;
};

const ModalContainer = styled.div`
  // Get the dropdown to size itself based on the webpage width, but resize itself to match the
  // input area (~100vw - 100px of padding) when the webpage is very narrow
  .ant-select-dropdown {
    // TODO: Size to max-content so there isn't extra dead space past the end of the current items.
    // Setting width to max-content directly causes the dropdown to collapse to a width of
    // 0 pixels when more than 8 items are present and scrolling becomes enabled.
    width: 100% !important;
    max-width: calc(max(50vw, min(400px, 100vw - 100px)));
  }
`;

export default function LoadModal(props: LoadModalProps): ReactElement {
  const [showModal, _setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [errorText, setErrorText] = useState<string>("");

  const [recentDataUrls, addRecentDataUrl] = useRecentDataUrls();

  const modalContainerRef = useRef<HTMLDivElement>(null);

  const setShowModal = (show: boolean): void => {
    if (show) {
      setUrlInput("");
      setErrorText("");
    }
    _setShowModal(show);
  };

  const onClickLoad = (): void => {
    // TODO: Handle multiple URLs?

    // Note: S3 URIs, GCS URIs, and Vast file paths are handled by vole-core.
    const trimmedUrlInput = urlInput.trim();
    if (!isValidUrl(trimmedUrlInput)) {
      setErrorText("Please enter a valid URL, starting with https://, s3://, or gs://.");
      return;
    }

    const appProps: AppDataProps = {
      imageUrl: trimmedUrlInput,
      imageDownloadHref: trimmedUrlInput,
      cellId: "1",
      parentImageUrl: "",
      parentImageDownloadHref: "",
      // Enable first three channels by default
      viewerChannelSettings: {
        groups: [
          {
            name: "Channels",
            channels: [
              { match: [0, 1, 2], enabled: true },
              { match: "(.+)", enabled: false },
            ],
          },
        ],
      },
    };
    props.onLoad(appProps);
    addRecentDataUrl({ url: urlInput, label: urlInput });
    setShowModal(false);
  };

  // Set up fuse for fuzzy searching on the labels of recent datasets
  const fuse = useMemo(() => {
    return new Fuse(recentDataUrls, {
      keys: ["label"],
      isCaseSensitive: false,
      shouldSort: true, // sorts by match score
      ignoreLocation: true, // search more than first 60 characters
      findAllMatches: true, // return all matches
    });
  }, [recentDataUrls]);

  // This search could be done using a transition if needed, but since there is a max of 100 urls,
  // performance hits should be minimal.
  const autoCompleteOptions: { label: React.ReactNode; value: string }[] = useMemo(() => {
    let filteredItems: RecentDataUrl[] = [];
    if (urlInput === "") {
      // Show first 20 recent data urls
      filteredItems = recentDataUrls.slice(0, MAX_RECENT_URLS_TO_DISPLAY);
    } else {
      // Show first 20 search results
      filteredItems = fuse
        .search(urlInput)
        .slice(0, MAX_RECENT_URLS_TO_DISPLAY)
        .map((option) => option.item);
    }
    return filteredItems.map((item) => {
      return {
        label: <MiddleTruncatedText text={item.label} />,
        value: item.url,
      };
    });
  }, [urlInput, fuse, recentDataUrls]);

  const getAutoCompletePopupContainer = modalContainerRef.current ? () => modalContainerRef.current! : undefined;

  return (
    <ModalContainer ref={modalContainerRef}>
      <Button type="link" onClick={() => setShowModal(!showModal)}>
        <UploadOutlined />
        Load
      </Button>
      <Modal
        open={showModal}
        title={"Load"}
        onCancel={() => setShowModal(false)}
        getContainer={modalContainerRef.current || undefined}
        okButtonProps={{}}
        footer={
          <Button type="default" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
        }
        destroyOnClose={true}
      >
        <p style={{ fontSize: "16px" }}>Provide the URL to load your OME-Zarr or OME-TIFF* data.</p>
        <p style={{ fontSize: "12px" }}>
          <i>*Note: this tool is intended for OME-Zarr use. Large {"(> 100 MB)"} OME-TIFF files are not supported.</i>
        </p>
        <FlexRow $gap={6}>
          <AutoComplete
            value={urlInput}
            onChange={(value) => setUrlInput(value)}
            onSelect={setUrlInput}
            style={{ width: "100%" }}
            allowClear={true}
            options={autoCompleteOptions}
            getPopupContainer={getAutoCompletePopupContainer}
            placeholder="Enter a URL..."
            autoFocus={true}
          ></AutoComplete>
          <Button type="primary" onClick={onClickLoad}>
            Load
          </Button>
        </FlexRow>
        {errorText !== "" && <p style={{ color: "var(--color-text-error)" }}>{errorText}</p>}
      </Modal>
    </ModalContainer>
  );
}
