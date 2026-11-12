import type { View3d } from "@aics/vole-core";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { Button, Card, InputNumber, Space, Tooltip } from "antd";
import React, { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

import { FlexColumn, FlexRow, FlexRowAlignCenter, VisuallyHidden } from "../../shared/utils";

import { SettingsContainer, SettingsItem } from "../../shared/SettingsContainer";

import styles from "./styles.module.css";

type RecordingDimensionControlsProps = {
  view3d: View3d;
  isRecording: boolean;
  settingsIndentPx: number;

  dimensions: [number, number];
  setDimensions: (dimensions: [number, number]) => void;
  exportDimensions: [number, number];
};

const enum RecordingDimensionControlsHtmlIds {
  FRAME_DIMENSION_WIDTH_INPUT_ID = "export-modal-dimensions-width-input",
  FRAME_DIMENSION_HEIGHT_INPUT_ID = "export-modal-dimensions-height",
  FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT = "export-modal-frame-custom-range-frame-increment-input",
  FINAL_DIMENSIONS_TEXT = "export-modal-final-dimensions-text",
}

export default function RecordingDimensionControls(props: RecordingDimensionControlsProps): ReactElement {
  const { view3d, isRecording, dimensions, setDimensions, exportDimensions } = props;

  const cardRef = useRef<HTMLDivElement | null>(null);

  const [useCurrentViewportSize, setUseCurrentViewportSize] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number | null>(1);
  const [viewportDimensions, setViewportDimensions] = useState([1, 1]);

  //// MARK: Listeners

  // Keep aspect ratio and and viewport dimensions in sync with viewport when
  // the user is using the current viewport size.
  useEffect(() => {
    const canvasHtmlElement = view3d.getCanvasDOMElement();
    const observer = new ResizeObserver(() => {
      const width = canvasHtmlElement.width;
      const height = canvasHtmlElement.height;
      setViewportDimensions([width, height]);
      if (useCurrentViewportSize && !isRecording) {
        setDimensions([width, height]);
        setAspectRatio(width / height);
      }
    });
    observer.observe(canvasHtmlElement);
    return () => observer.disconnect();
  }, [isRecording, useCurrentViewportSize, view3d, setDimensions]);

  //// MARK: Handlers

  const onSetDimensions = useCallback(
    (dimensions: [number, number]) => {
      setDimensions(dimensions);
      if (aspectRatio) {
        setAspectRatio(dimensions[0] / dimensions[1]);
      }
    },
    [aspectRatio, setDimensions]
  );

  const handleSetWidth = (width: number | null): void => {
    if (width !== null) {
      width = Math.max(1, width);
      if (aspectRatio !== null) {
        let height = Math.max(Math.round(width / aspectRatio), 1);
        setDimensions([Math.round(width), height]);
      } else {
        setDimensions([Math.round(width), dimensions[1]]);
      }
    }
    setUseCurrentViewportSize(false);
  };

  const handleSetHeight = (height: number | null): void => {
    if (height !== null) {
      height = Math.max(1, height);
      if (aspectRatio !== null) {
        let width = Math.max(Math.round(height * aspectRatio), 1);
        setDimensions([width, Math.round(height)]);
      } else {
        setDimensions([dimensions[0], Math.round(height)]);
      }
    }
    setUseCurrentViewportSize(false);
  };

  const onToggleAspectRatio = (): void => {
    if (aspectRatio !== null) {
      setAspectRatio(null);
    } else {
      setAspectRatio(dimensions[0] / dimensions[1]);
    }
    setUseCurrentViewportSize(false);
  };

  //// MARK: Rendering

  return (
    <Card size="small" title={"Dimensions"} ref={cardRef}>
      <SettingsContainer gapPx={6} indentPx={props.settingsIndentPx}>
        <SettingsItem
          label="Frame dimensions"
          labelStyle={{ marginTop: "2px", height: "min-content" }}
          htmlFor={RecordingDimensionControlsHtmlIds.FRAME_DIMENSION_WIDTH_INPUT_ID}
        >
          <FlexColumn style={{ alignItems: "flex-start", paddingBottom: "8px" }} $gap={6}>
            <FlexRow $gap={6}>
              <Button
                onClick={() => {
                  onSetDimensions(viewportDimensions as [number, number]);
                  setUseCurrentViewportSize(true);
                }}
                type={useCurrentViewportSize ? "primary" : "default"}
                disabled={isRecording}
              >
                Set to viewport
              </Button>
              {/*
               * TODO: Implement a mode where, in axis view mode, the viewport
               * can be set to JUST the image and image dimensions.
               */}
              {/* <Button
                disabled={imageDimensions === null}
                type={isImageDimensions ? "primary" : "default"}
                onClick={() => {
                  imageDimensions && onSetDimensions([imageDimensions[0], imageDimensions[1]]);
                  setUseCurrentViewportSize(false);
                }}
              >
                Set to image
              </Button> */}
            </FlexRow>
            <FlexColumn>
              <FlexRowAlignCenter className={styles.flexRowWrap} style={{ gap: "4px" }}>
                <Space.Compact>
                  <Space.Addon>
                    <p className={styles.hintText}>W</p>
                  </Space.Addon>
                  <InputNumber
                    className={styles.dimensionInput}
                    id={RecordingDimensionControlsHtmlIds.FRAME_DIMENSION_WIDTH_INPUT_ID}
                    disabled={isRecording}
                    aria-label="Width"
                    value={dimensions[0]}
                    onChange={handleSetWidth}
                    controls={false}
                    style={{ width: "90px" }}
                  />
                </Space.Compact>
                <span style={{ padding: "0 4px" }}>×</span>
                <Space.Compact>
                  <Space.Addon>
                    <p className={styles.hintText}>H</p>
                  </Space.Addon>
                  <InputNumber
                    className={styles.dimensionInput}
                    id={RecordingDimensionControlsHtmlIds.FRAME_DIMENSION_HEIGHT_INPUT_ID}
                    disabled={isRecording}
                    aria-label="Height"
                    value={dimensions[1]}
                    onChange={handleSetHeight}
                    controls={false}
                    style={{ width: "90px" }}
                  />
                </Space.Compact>
                <Tooltip
                  title={aspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                  trigger={["hover", "focus"]}
                  getPopupContainer={() => cardRef.current || document.body}
                >
                  <Button
                    type={aspectRatio ? "primary" : "link"}
                    disabled={isRecording}
                    style={{ fontSize: "20px", padding: "6px" }}
                    onClick={onToggleAspectRatio}
                  >
                    {aspectRatio ? <LockOutlined /> : <UnlockOutlined />}
                    <VisuallyHidden>{aspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}</VisuallyHidden>
                  </Button>
                </Tooltip>
              </FlexRowAlignCenter>
            </FlexColumn>
          </FlexColumn>
        </SettingsItem>
        <SettingsItem label="Exported file dimensions" isDisplayOnly={true}>
          <p
            className={styles.hintText}
            id={RecordingDimensionControlsHtmlIds.FINAL_DIMENSIONS_TEXT}
          >{`${exportDimensions[0]} × ${exportDimensions[1]}`}</p>
        </SettingsItem>
      </SettingsContainer>
    </Card>
  );
}
