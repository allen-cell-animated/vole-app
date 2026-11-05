import type { View3d, Volume } from "@aics/vole-core";
import { LockOutlined, UnlockOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { Button, Card, Input, InputNumber, Modal, Radio, type RadioChangeEvent, Space, Tooltip } from "antd";
import React, { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clamp } from "../../../shared/utils/math";
import type PlayControls from "../../../shared/utils/playControls";
import { useViewerState } from "../../../state/store";
import {
  FlexColumn,
  FlexColumnAlignCenter,
  FlexRow,
  FlexRowAlignCenter,
  StyledRadioGroup,
  VisuallyHidden,
} from "../../shared/utils";

import type { RecordingOptions } from "../../../shared/utils/recorders/CanvasRecorder";
import Mp4VideoRecorder from "../../../shared/utils/recorders/Mp4VideoRecorder";
import { SettingsContainer, SettingsItem } from "../../shared/SettingsContainer";
import StyledInlineProgress from "../../shared/StyledInlineProgress";

import styles from "./styles.module.css";

// Align settings both inside and outside of cards
const CARD_SETTINGS_INDENT_PX = 5;
const SETTINGS_INDENT_PX = 18;
const TOOLTIP_TRIGGER: ("hover" | "focus")[] = ["hover", "focus"];
const HINT_CSS_COLOR = "var(--color-text-hint)";

const enum ExportHtmlIds {
  FRAME_RANGE_RADIO = "export-modal-frame-range-radio",
  FRAME_RANGE_RADIO_LABEL_ID = "export-modal-frame-range-radio-label",
  FRAME_CUSTOM_RANGE_INPUT = "export-modal-frame-custom-range-input",
  FRAME_DIMENSION_WIDTH_INPUT = "export-modal-dimensions-width-input",
  FRAME_DIMENSION_HEIGHT_INPUT_ID = "export-modal-dimensions-height",
  FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT = "export-modal-frame-custom-range-frame-increment-input",
  SHOW_FEATURE_LEGEND_CHECKBOX = "export-modal-show-feature-legend-checkbox",
  SHOW_DATASET_NAME_CHECKBOX = "export-modal-show-dataset-name-checkbox",
  FINAL_DIMENSIONS_TEXT = "export-modal-final-dimensions-text",
  FPS_INPUT = "export-modal-fps-input",
  VIDEO_QUALITY_RADIO = "export-modal-video-quality-radio",
  IMAGE_FILENAME_INPUT = "export-modal-image-filename-input",
}

type RecordingButtonProps = {
  view3d: View3d;
  volume: Volume | null;
  playControls: PlayControls;
};

const enum RangeMode {
  ALL,
  CURRENT,
  CUSTOM,
}

const enum RecordingMode {
  IMAGE_SEQUENCE,
  VIDEO_MP4,
}

export enum VideoBitrate {
  HIGH = 1e8, // 100 Mbps
  MEDIUM = 1e7, // 10 Mbps
  LOW = 5e6, // 5 Mbps
}

// MARK: Helpers

function getPixelRatio(): number {
  return window.devicePixelRatio || 1;
}

function toEven(value: number): number {
  return Math.round(value / 2) * 2;
}

export default function RecordingButton(props: RecordingButtonProps): ReactElement {
  //////////////////////////////////////////////////////////
  //// MARK: State
  //////////////////////////////////////////////////////////

  const originalFrameRef = useRef(0);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const exportModalRef = useRef<HTMLDivElement | null>(null);

  // Store initial time on modal open so it can be restored on close.
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const setIsModalOpen = (open: boolean): void => {
    if (open === isModalOpen) {
      return;
    }
    _setIsModalOpen(open);
    if (open) {
      props.playControls.pause();
      setErrorText("");
      originalFrameRef.current = useViewerState.getState().time;
    } else if (props.volume) {
      props.view3d.setTime(props.volume, originalFrameRef.current);
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingCloseAnimation, setIsPlayingCloseAnimation] = useState(false);
  const [percentComplete, setPercentComplete] = useState(0);

  const recorderRef = useRef<Mp4VideoRecorder | null>(null);
  const [errorText, setErrorText] = useState("");
  const [recordingMode, _setRecordingMode] = useState(RecordingMode.IMAGE_SEQUENCE);

  const totalFrames = props.volume?.imageInfo.times ?? 0;
  const [rangeMode, setRangeMode] = useState(RangeMode.ALL);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(totalFrames - 1);

  const pixelRatio = getPixelRatio();

  const [viewportDimensions, setViewportDimensions] = useState([0, 0]);

  /** Final size of the exported image/video frame, based on current options. */
  const exportDimensions = useMemo(() => {
    return [Math.floor(viewportDimensions[0] / pixelRatio), Math.floor(viewportDimensions[1] / pixelRatio)];
  }, [viewportDimensions, pixelRatio]);

  const defaultImagePrefix = useMemo(() => {
    const volume = props.volume;
    if (!volume) {
      return "";
    }
    return `${volume.imageInfo.imageInfo.name}-${exportDimensions[0]}x${exportDimensions[1]}`;
  }, [exportDimensions, props.volume]);

  const [imagePrefix, setImagePrefix] = useState(defaultImagePrefix);
  const [useDefaultImagePrefix, setUseDefaultImagePrefix] = useState(true);
  const [frameIncrement, setFrameIncrement] = useState(1);
  const [fps, setFps] = useState(12);
  const [videoBitsPerSecond, setVideoBitsPerSecond] = useState(VideoBitrate.MEDIUM);

  //////////////////////////////////////////////////////////
  //// MARK: State Handlers
  //////////////////////////////////////////////////////////

  const getImagePrefix = (): string => {
    if (useDefaultImagePrefix) {
      if (recordingMode === RecordingMode.IMAGE_SEQUENCE) {
        // Add separator between prefix and frame number
        return defaultImagePrefix + "-";
      } else {
        return defaultImagePrefix;
      }
    } else {
      return imagePrefix;
    }
  };

  // Override setRecordingMode when switching to video; users should not choose current frame only
  // (since exporting the current frame only as a video doesn't really make sense.)
  const setRecordingMode = (mode: RecordingMode): void => {
    _setRecordingMode(mode);
    if (mode === RecordingMode.VIDEO_MP4 && rangeMode === RangeMode.CURRENT) {
      setRangeMode(RangeMode.ALL);
    }
  };

  useEffect(() => {
    const canvasHtmlElement = props.view3d.getCanvasDOMElement();
    const observer = new ResizeObserver(() => {
      setViewportDimensions([canvasHtmlElement.clientWidth, canvasHtmlElement.clientHeight]);
    });
    observer.observe(canvasHtmlElement);
    return () => observer.disconnect();
  }, []);

  //////////////////////////////////////////////////////////
  //// MARK: Callbacks
  //////////////////////////////////////////////////////////

  const stopRecording = useCallback(
    async (closeModal: boolean): Promise<void> => {
      recorderRef.current?.abort();
      // Reset the frame number (clean up!)
      if (props.volume) {
        await props.view3d.setTime(props.volume, originalFrameRef.current);
      }
      setIsRecording(false);
      recorderRef.current = null;
      setIsPlayingCloseAnimation(false);
      setPercentComplete(0);
      props.playControls.pause();
      if (closeModal) {
        setIsModalOpen(false);
      }
    },
    [props.view3d, props.volume]
  );
  const handleCancel = () => {
    if (!isRecording) {
      setIsModalOpen(false);
      return;
    }
    setIsRecording(false);
    // TODO: Confirm with user before exiting
    stopRecording(true);
  };

  const handleStop = async (): Promise<void> => {
    await stopRecording(false);
    setErrorText("");
  };

  const handleStartRecord = (): void => {
    const volume = props.volume;
    if (!volume) {
      return;
    }
    setErrorText("");
    setIsRecording(true);

    // Set play axis to t for prefetching.
    props.playControls.playingAxis = "t";
    props.playControls?.onPlayingAxisChanged?.("t");

    /** Min and max are both inclusive */
    let min: number, max: number;
    switch (rangeMode) {
      case RangeMode.ALL:
        min = 0;
        max = totalFrames - 1;
        break;
      case RangeMode.CURRENT:
        const currentFrame = useViewerState.getState().time;
        min = currentFrame;
        max = currentFrame;
        break;
      case RangeMode.CUSTOM:
        // Clamp range values in case of unsafe input
        min = clamp(customMin, 0, totalFrames - 1);
        max = clamp(customMax, min, totalFrames - 1);
    }

    const setFrame = async (frame: number) => {
      await props.view3d.setTime(volume, frame);
      props.view3d.redraw(true);
    };
    const getCanvas = () => props.view3d.getCanvasDOMElement();
    const options: Partial<RecordingOptions> = {
      min,
      max,
      fps: fps,
      minDigits: (totalFrames - 1).toString().length,
      bitrate: videoBitsPerSecond,
      prefix: "vole_recording_" + volume.imageInfo.imageInfo.name,
      onCompleted: async () => {
        setPercentComplete(100);
        // TODO: Show success notification
        // Close the modal after a small delay so the success notification can be seen
        setIsPlayingCloseAnimation(true);
        setTimeout(() => stopRecording(true), 750);
        // Reset play axis
        props.playControls.pause();
        recorderRef.current = null;
      },
      onRecordedFrame: (frame: number) => {
        // Update the progress bar as frames are recorded.
        setPercentComplete(Math.floor(((frame - min) / (max - min)) * 100));
      },
      onError: (error: Error) => {
        setErrorText(error.message);
      },
    };
    recorderRef.current = new Mp4VideoRecorder(setFrame, getCanvas, options);
    recorderRef.current.start();
  };

  //////////////////////////////////////////////////////////
  //// MARK: Rendering
  //////////////////////////////////////////////////////////

  const videoQualityOptions = [
    { label: "High", value: VideoBitrate.HIGH },
    { label: "Med", value: VideoBitrate.MEDIUM },
    { label: "Low", value: VideoBitrate.LOW },
  ];

  const isWebCodecsEnabled = Mp4VideoRecorder.isSupported();
  const customRangeFrames = Math.max(Math.ceil((customMax - customMin + 1) / frameIncrement), 1);

  const numFrames = rangeMode === RangeMode.CUSTOM ? customRangeFrames : totalFrames;
  const totalSeconds = numFrames / fps;

  // Gets the total duration as a MM min, SS sec label.
  // Also adds decimal places for small durations.
  const getDurationLabel = (): string => {
    const durationMin = Math.floor(totalSeconds / 60);
    const durationSec = totalSeconds - durationMin * 60;

    let timestamp = "";
    if (durationMin > 0) {
      timestamp += durationMin.toString() + " min, ";
    }
    // Format seconds to hundredths if less than 10 seconds
    if (durationMin === 0 && durationSec < 10) {
      // Round digits to 2 decimal places
      const roundedSeconds = Math.round(durationSec * 100) / 100;
      timestamp += roundedSeconds.toFixed(2) + " sec";
    } else {
      timestamp += Math.floor(durationSec).toString() + " sec";
    }
    return timestamp;
  };

  const getApproximateVideoFilesizeMb = (): string => {
    // From experimentation, filesize scales linearly (ish) with the
    // bitrate and duration unless a maximum filesize is hit at high
    // bitrates, which seems to depend on the video dimensions.

    // Video quality is bitrate in bits/second.
    // This is usually within 0.5-2x the actual filesize.
    const maxVideoBitsDuration = totalSeconds * videoBitsPerSecond;

    // Experimentally-determined compression ratio (bits per pixel), which determines
    // maximum size a video can be at very high bitrates. This may vary WILDLY based
    // on image complexity (videos with little change will compress better).
    // This is here because otherwise the filesize estimate is way too high for high bitrates
    // (475 MB predicted vs. 70 MB actual)
    // TODO: Is there a way to concretely determine this?
    const compressionRatioBitsPerPixel = 3.5; // Actual value 2.7-3.0, overshooting to be safe
    const maxVideoBitsResolution = exportDimensions[0] * exportDimensions[1] * numFrames * compressionRatioBitsPerPixel;

    const sizeInMb = Math.min(maxVideoBitsResolution, maxVideoBitsDuration) / 8_000_000; // bits to MB

    if (sizeInMb > 1) {
      return Math.round(sizeInMb) + " MB";
    } else {
      // Round to one decimal place, with a minimum of 0.1 MB. (We don't need to be too precise
      // because these are estimates.)
      return Math.max(1, Math.round(sizeInMb * 10)) / 10 + " MB";
    }
  };

  // Footer for the Export modal.
  // Layout: Optional Progress meter - Export/Stop Button - Cancel Button
  const modalFooter = (
    <div className={styles.modalFooter}>
      <div
        className={styles.flexRowWrap}
        style={{ alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}
      >
        {(percentComplete !== 0 || isRecording) && (
          <StyledInlineProgress percent={percentComplete} error={!!errorText} />
        )}
        <Button onClick={handleCancel} style={{ width: "76px" }} disabled={isPlayingCloseAnimation}>
          {isRecording ? "Cancel" : "Close"}
        </Button>
        <Button
          type={isRecording ? "default" : "primary"}
          onClick={isRecording ? handleStop : handleStartRecord}
          style={{ width: "76px" }}
          disabled={isPlayingCloseAnimation}
          id={isRecording ? "export-modal-stop-button" : "export-modal-export-button"}
        >
          {isRecording ? "Stop" : "Export"}
        </Button>
      </div>
      <div>
        {errorText && (
          <p style={{ color: "var(--color-text-error)", textAlign: "left", textWrap: "wrap" }}>{errorText}</p>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <Tooltip placement="bottom" title="Record">
        <Button className="ant-btn-icon-only btn-borderless" onClick={() => setIsModalOpen(true)}>
          <VideoCameraOutlined />
        </Button>
      </Tooltip>

      {/* Export modal */}
      <div ref={modalContainerRef}>
        <Modal
          className={styles.exportModal}
          title="Export"
          open={isModalOpen}
          // Do not allow cancellation of modal by clicking outside it when recording
          mask={{ closable: !isRecording }}
          onCancel={handleCancel}
          footer={modalFooter}
          getContainer={() => modalContainerRef.current ?? document.body}
        >
          <div className={styles.exportModalContent} ref={exportModalRef}>
            {/* Recording type (image/video) radio */}
            <FlexColumnAlignCenter>
              <StyledRadioGroup
                className={styles.exportModeRadioGroup}
                value={recordingMode}
                buttonStyle="solid"
                optionType="button"
                onChange={(e) => setRecordingMode(e.target.value)}
                disabled={isRecording}
              >
                <Radio className={styles.exportModeRadio} value={RecordingMode.IMAGE_SEQUENCE}>
                  PNG image sequence
                </Radio>
                {/* Optional tooltip here in case WebCodecs API is not enabled. */}
                <Tooltip
                  title={"Video recording isn't supported by this browser."}
                  open={isWebCodecsEnabled ? false : undefined}
                  trigger={TOOLTIP_TRIGGER}
                >
                  <Radio
                    className={styles.exportModeRadio}
                    value={RecordingMode.VIDEO_MP4}
                    disabled={isRecording || !isWebCodecsEnabled}
                  >
                    MP4 video
                  </Radio>
                </Tooltip>
              </StyledRadioGroup>
            </FlexColumnAlignCenter>

            {/* Range options (All/Current Frame/Custom) */}
            <Card size="small" title="Frame range">
              <Radio.Group
                className={styles.rangeRadioGroup}
                // TODO: Use fieldset + label to align with accessibility standards
                value={rangeMode}
                onChange={(e: RadioChangeEvent) => {
                  setRangeMode(e.target.value);
                }}
                disabled={isRecording}
                id={ExportHtmlIds.FRAME_RANGE_RADIO}
              >
                <Space orientation="vertical" align="start">
                  <Radio value={RangeMode.ALL}>
                    All frames{" "}
                    {rangeMode === RangeMode.ALL && (
                      <span className={styles.hintText} style={{ marginLeft: "4px" }}>
                        ({totalFrames} frames total)
                      </span>
                    )}
                  </Radio>
                  <Radio value={RangeMode.CURRENT} disabled={isRecording || recordingMode === RecordingMode.VIDEO_MP4}>
                    Current frame only
                  </Radio>
                  <Radio value={RangeMode.CUSTOM}>Custom range</Radio>

                  {rangeMode === RangeMode.CUSTOM ? (
                    // Render the custom range input in the radio list if selected
                    <SettingsContainer
                      indentPx={CARD_SETTINGS_INDENT_PX}
                      className={styles.customRangeSettingsContainer}
                    >
                      <SettingsItem label="Range" htmlFor={ExportHtmlIds.FRAME_CUSTOM_RANGE_INPUT}>
                        <FlexRowAlignCenter className={styles.flexRowWrap}>
                          <InputNumber
                            id={ExportHtmlIds.FRAME_CUSTOM_RANGE_INPUT}
                            style={{ width: 60 }}
                            aria-label="min frame"
                            controls={false}
                            min={0}
                            max={totalFrames - 1}
                            value={customMin}
                            onChange={(value) => value && setCustomMin(value)}
                            disabled={isRecording}
                          />
                          <p>-</p>
                          <InputNumber
                            style={{ width: 60 }}
                            aria-label="max frame"
                            controls={false}
                            min={customMin}
                            max={totalFrames - 1}
                            value={customMax}
                            onChange={(value) => value && setCustomMax(value)}
                            disabled={isRecording}
                          />
                          <p>of {totalFrames - 1}</p>
                        </FlexRowAlignCenter>
                      </SettingsItem>
                      <SettingsItem
                        label="Frame increment"
                        htmlFor={ExportHtmlIds.FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT}
                      >
                        <FlexRowAlignCenter $gap={6}>
                          <InputNumber
                            id={ExportHtmlIds.FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT}
                            value={frameIncrement}
                            onChange={(value) => value && setFrameIncrement(value)}
                            min={1}
                            max={totalFrames - 1}
                            disabled={isRecording}
                            style={{ width: 140 }}
                          />
                          <p style={{ color: HINT_CSS_COLOR }}>({customRangeFrames} frames total)</p>
                        </FlexRowAlignCenter>
                      </SettingsItem>
                    </SettingsContainer>
                  ) : null}
                </Space>
              </Radio.Group>
            </Card>
            <Card size="small" title={"Dimensions"}>
              <SettingsContainer gapPx={6} indentPx={CARD_SETTINGS_INDENT_PX}>
                <SettingsItem label="Exported file dimensions" isNonFormComponent={true}>
                  <p
                    className={styles.hintText}
                    id={ExportHtmlIds.FINAL_DIMENSIONS_TEXT}
                  >{`${exportDimensions[0]} × ${exportDimensions[1]}`}</p>
                </SettingsItem>
              </SettingsContainer>
            </Card>

            <SettingsContainer indentPx={SETTINGS_INDENT_PX} gapPx={6}>
              {recordingMode === RecordingMode.VIDEO_MP4 && (
                <>
                  <SettingsItem label="Frames per second" htmlFor={ExportHtmlIds.FPS_INPUT}>
                    <FlexRowAlignCenter $gap={6} style={{ alignItems: "center", paddingTop: 4 }}>
                      <InputNumber
                        id={ExportHtmlIds.FPS_INPUT}
                        value={fps}
                        onChange={(value) => value !== null && Number.isFinite(value) && setFps(Math.max(0, value))}
                        min={1}
                        max={120}
                        disabled={isRecording}
                        width="175px"
                      />
                      <p className={styles.hintText}>({getDurationLabel()})</p>
                    </FlexRowAlignCenter>
                  </SettingsItem>
                  <SettingsItem label="Video quality" htmlFor={ExportHtmlIds.VIDEO_QUALITY_RADIO}>
                    <FlexRowAlignCenter $gap={6}>
                      <StyledRadioGroup
                        className={styles.videoQualityRadioGroup}
                        id={ExportHtmlIds.VIDEO_QUALITY_RADIO}
                        disabled={isRecording}
                        options={videoQualityOptions}
                        optionType="button"
                        value={videoBitsPerSecond}
                        onChange={(e) => setVideoBitsPerSecond(e.target.value)}
                      />
                      <p className={styles.hintText}>(~{getApproximateVideoFilesizeMb()})</p>
                    </FlexRowAlignCenter>
                  </SettingsItem>
                </>
              )}
              {/* Filename prefix */}
              <SettingsItem label={"Filename"} htmlFor={ExportHtmlIds.IMAGE_FILENAME_INPUT}>
                <FlexRowAlignCenter $gap={6}>
                  <Input
                    id={ExportHtmlIds.IMAGE_FILENAME_INPUT}
                    onChange={(event) => {
                      setImagePrefix(event.target.value);
                      setUseDefaultImagePrefix(false);
                    }}
                    value={getImagePrefix()}
                    disabled={isRecording}
                  />
                  <p>{recordingMode === RecordingMode.IMAGE_SEQUENCE ? "#.png" : ".mp4"}</p>
                  <Button
                    disabled={isRecording || useDefaultImagePrefix}
                    onClick={() => {
                      setUseDefaultImagePrefix(true);
                    }}
                  >
                    Reset
                  </Button>
                </FlexRowAlignCenter>
              </SettingsItem>
            </SettingsContainer>
            <br />
          </div>
        </Modal>
      </div>
    </div>
  );
}
