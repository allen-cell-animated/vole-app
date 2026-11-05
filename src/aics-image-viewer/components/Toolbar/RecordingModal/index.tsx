import type { View3d, Volume } from "@aics/vole-core";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { Button, Card, Input, InputNumber, Modal, Radio, Space, Tooltip } from "antd";
import React, { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TOOLTIP_TRIGGER } from "../../../shared/constants";
import { clamp } from "../../../shared/utils/math";
import type PlayControls from "../../../shared/utils/playControls";
import { getPixelRatio } from "../../../shared/utils/window";
import { select, useViewerState } from "../../../state/store";
import { FlexColumn, FlexColumnAlignCenter, FlexRow, FlexRowAlignCenter, VisuallyHidden } from "../../shared/utils";
import { RangeMode, RecordingMode } from "./types";
import { getApproximateVideoFilesizeMb, getDurationLabel, getFrameCount } from "./utils";

import type { RecordingOptions } from "../../../shared/utils/recorders/CanvasRecorder";
import type CanvasRecorder from "../../../shared/utils/recorders/CanvasRecorder";
import ImageSequenceRecorder from "../../../shared/utils/recorders/ImageSequenceRecorder";
import Mp4VideoRecorder from "../../../shared/utils/recorders/Mp4VideoRecorder";
import { SettingsContainer, SettingsItem } from "../../shared/SettingsContainer";
import StyledInlineProgress from "../../shared/StyledInlineProgress";
import RecordingRangeControl from "./RecordingRangeControl";

import styles from "./styles.module.css";

function toEven(value: number): number {
  return Math.round(value / 2) * 2;
}

const enum RecordingHtmlIds {
  // FRAME_RANGE_RADIO = "recording-modal-frame-range-radio",
  // FRAME_RANGE_RADIO_LABEL_ID = "recording-modal-frame-range-radio-label",
  // FRAME_CUSTOM_RANGE_INPUT = "recording-modal-frame-custom-range-input",
  // FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT = "recording-modal-frame-custom-range-frame-increment-input",
  FRAME_DIMENSION_WIDTH_INPUT = "recording-modal-dimensions-width-input",
  FRAME_DIMENSION_HEIGHT_INPUT = "recording-modal-dimensions-height",
  SHOW_FEATURE_LEGEND_CHECKBOX = "recording-modal-show-feature-legend-checkbox",
  SHOW_DATASET_NAME_CHECKBOX = "recording-modal-show-dataset-name-checkbox",
  FINAL_DIMENSIONS_TEXT = "recording-modal-final-dimensions-text",
  FPS_INPUT = "recording-modal-fps-input",
  VIDEO_QUALITY_RADIO = "recording-modal-video-quality-radio",
  IMAGE_FILENAME_INPUT = "recording-modal-image-filename-input",
}

type RecordingModalProps = {
  view3d: View3d;
  volume: Volume;
  playControls: PlayControls;
  open: boolean;
  setIsOpen: (open: boolean) => void;
  setCanvasResolution(resolution: [number, number] | null): void;
};

export enum VideoBitrate {
  HIGH = 1e8, // 100 Mbps
  MEDIUM = 1e7, // 10 Mbps
  LOW = 5e6, // 5 Mbps
}

const RECORDING_CARD_SETTINGS_INDENT_PX = 5;
const RECORDING_SETTINGS_INDENT_PX = 18;

// MARK: Helpers

export default function RecordingModal(props: RecordingModalProps): ReactElement {
  //////////////////////////////////////////////////////////
  //// MARK: State
  //////////////////////////////////////////////////////////

  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  const originalFrameRef = useRef(0);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const exportModalRef = useRef<HTMLDivElement | null>(null);

  const { open: isModalOpen, setIsOpen: _setIsModalOpen, view3d, volume, playControls, setCanvasResolution } = props;

  // Store the original frame on close.
  const setIsModalOpen = useCallback(
    (open: boolean): void => {
      if (!open) {
        view3d.setTime(volume, originalFrameRef.current);
      }
      _setIsModalOpen(open);
    },
    [_setIsModalOpen, view3d, volume]
  );

  // On open, save the current frame so it can be restored on modal close.
  useEffect(() => {
    if (isModalOpen) {
      playControls.pause();
      setErrorText("");
      originalFrameRef.current = useViewerState.getState().time;
      // Disable auto-rotation
      changeViewerSetting("autorotate", false);
    }
  }, [isModalOpen, changeViewerSetting, playControls]);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingCloseAnimation, setIsPlayingCloseAnimation] = useState(false);
  const [percentComplete, setPercentComplete] = useState(0);
  const recorderRef = useRef<CanvasRecorder | null>(null);
  const [errorText, setErrorText] = useState("");
  const [recordingMode, _setRecordingMode] = useState(RecordingMode.IMAGE_SEQUENCE);

  //// Frame range
  const totalFrames = volume.imageInfo.times;
  const [rangeMode, setRangeMode] = useState(RangeMode.ALL);
  // Uses 1-based indexing to match rest of Vol-E UI.
  const [customMin, setCustomMin] = useState(1);
  const [customMax, setCustomMax] = useState(totalFrames);
  const [frameIncrement, setFrameIncrement] = useState(1);

  //// Resolution and dimensions
  const [useCurrentViewportSize, setUseCurrentViewportSize] = useState(true);
  const [dimensionsInput, setDimensionsInput] = useState([1, 1]);
  const [aspectRatio, setAspectRatio] = useState<number | null>(1);
  const pixelRatio = getPixelRatio();
  const [viewportDimensions, setViewportDimensions] = useState([1, 1]);
  const isViewportDimensions =
    viewportDimensions[0] === dimensionsInput[0] && viewportDimensions[1] === dimensionsInput[1];

  const enforceEvenDims = recordingMode === RecordingMode.VIDEO_MP4;

  /**
   * Target resolution of the viewport area in the final rendered canvas.
   *
   * Note that the canvas' inner resolution is the canvas' size multiplied by
   * the device's pixel ratio. For example, an HTML canvas with a size of
   * 100x100 on a device and a pixel ratio of 1.5 (e.g. 150% zoom) will be
   * rendering at a resolution of 150x150.
   *
   * To get the canvas size from the resolution, this value needs to be divided
   * by the device pixel ratio.
   */
  const targetCanvasResolution = useMemo(() => {
    if (enforceEvenDims) {
      return dimensionsInput.map((value) => toEven(value));
    }
    return dimensionsInput.map((value) => Math.round(value));
  }, [dimensionsInput, enforceEvenDims]);

  /** Final size of the exported image/video frame, based on current options. */
  const exportDimensions = useMemo((): [number, number] => {
    const exportDimensions: [number, number] = [
      Math.floor(targetCanvasResolution[0] / pixelRatio),
      Math.floor(targetCanvasResolution[1] / pixelRatio),
    ];
    return exportDimensions;
  }, [targetCanvasResolution, pixelRatio, viewportDimensions]);

  //// Image prefix
  const defaultImagePrefix = useMemo(() => {
    return `${volume.imageInfo.imageInfo.name}-${exportDimensions[0]}x${exportDimensions[1]}`;
  }, [exportDimensions, volume]);

  const [imagePrefixInput, setImagePrefixInput] = useState(defaultImagePrefix);
  const [useDefaultImagePrefix, setUseDefaultImagePrefix] = useState(true);

  const imagePrefix = useMemo((): string => {
    if (useDefaultImagePrefix) {
      if (recordingMode === RecordingMode.IMAGE_SEQUENCE) {
        // Add separator between prefix and frame number
        return defaultImagePrefix + "-";
      } else {
        return defaultImagePrefix;
      }
    } else {
      return imagePrefixInput;
    }
  }, [useDefaultImagePrefix, defaultImagePrefix, imagePrefixInput, recordingMode]);

  //// Video settings
  const [fps, setFps] = useState(12);
  const [videoBitsPerSecond, setVideoBitsPerSecond] = useState(VideoBitrate.MEDIUM);

  //////////////////////////////////////////////////////////
  //// MARK: State Handlers
  //////////////////////////////////////////////////////////

  // Bound max and min by the total frames on volume changes. If this is the first time the
  // volume is loaded, this will also set the max bound.
  useEffect(() => {
    const maxFrame = volume.imageInfo.times;
    setCustomMin((min) => clamp(min, 0, maxFrame));
    setCustomMax((max) => clamp(max, 0, maxFrame));
  }, [volume]);

  // Override setRecordingMode when switching to video; users should not choose current frame only
  // (since exporting the current frame only as a video doesn't really make sense.)
  const setRecordingMode = (mode: RecordingMode): void => {
    _setRecordingMode(mode);
    if (mode === RecordingMode.VIDEO_MP4 && rangeMode === RangeMode.CURRENT) {
      setRangeMode(RangeMode.ALL);
    }
  };

  useEffect(() => {
    const canvasHtmlElement = view3d.getCanvasDOMElement();
    const observer = new ResizeObserver(() => {
      setViewportDimensions([canvasHtmlElement.clientWidth, canvasHtmlElement.clientHeight]);
    });
    observer.observe(canvasHtmlElement);
    if (useCurrentViewportSize && !isRecording) {
      setDimensionsInput([canvasHtmlElement.clientWidth, canvasHtmlElement.clientHeight]);
    }
    return () => observer.disconnect();
  }, [isRecording, useCurrentViewportSize, view3d]);

  useEffect(() => {
    if (useCurrentViewportSize) {
      setDimensionsInput([viewportDimensions[0] * pixelRatio, viewportDimensions[1] * pixelRatio]);
      if (aspectRatio) {
        setAspectRatio(viewportDimensions[0] / viewportDimensions[1]);
      }
    }
  }, [viewportDimensions, useCurrentViewportSize, aspectRatio, pixelRatio]);

  //////////////////////////////////////////////////////////
  //// MARK: Callbacks
  //////////////////////////////////////////////////////////

  const onSetDimensions = useCallback(
    (dimensions: [number, number]) => {
      setDimensionsInput(dimensions);
      if (aspectRatio) {
        setAspectRatio(dimensions[0] / dimensions[1]);
      }
    },
    [aspectRatio]
  );

  const handleSetWidth = (width: number | null): void => {
    if (width !== null) {
      if (aspectRatio !== null) {
        setDimensionsInput([Math.round(width), Math.round(width / aspectRatio)]);
      } else {
        setDimensionsInput([Math.round(width), dimensionsInput[1]]);
      }
    }
    setUseCurrentViewportSize(false);
  };

  const handleSetHeight = (height: number | null): void => {
    if (height !== null) {
      if (aspectRatio !== null) {
        setDimensionsInput([Math.round(height * aspectRatio), Math.round(height)]);
      } else {
        setDimensionsInput([dimensionsInput[0], Math.round(height)]);
      }
    }
    setUseCurrentViewportSize(false);
  };

  const stopRecording = useCallback(
    async (closeModal: boolean): Promise<void> => {
      recorderRef.current?.abort();
      // Reset the frame number (clean up!)
      await view3d.setTime(volume, originalFrameRef.current);
      setIsRecording(false);
      recorderRef.current = null;
      setIsPlayingCloseAnimation(false);
      setPercentComplete(0);
      playControls.pause();
      setCanvasResolution(null);
      if (closeModal) {
        setIsModalOpen(false);
      }
    },
    [view3d, volume, playControls, setCanvasResolution, setIsModalOpen]
  );
  const handleCancel = async (): Promise<void> => {
    if (!isRecording) {
      setIsModalOpen(false);
      return;
    }
    // TODO: Confirm with user before exiting
    await stopRecording(true);
  };

  const handleStop = async (): Promise<void> => {
    await stopRecording(false);
    setErrorText("");
  };

  const handleStartRecord = async (): Promise<void> => {
    if (!volume) {
      return;
    }
    setErrorText("");
    setIsRecording(true);

    // TODO: Set explicit scale level here, otherwise the playback will drop
    // to a lower resolution.
    // Set play axis to t for prefetching.
    playControls.playingAxis = "t";
    playControls?.onPlayingAxisChanged?.("t");

    /** Min and max are both inclusive */
    let min: number, max: number;
    const currentFrame = useViewerState.getState().time;
    switch (rangeMode) {
      case RangeMode.ALL:
        min = 0;
        max = totalFrames - 1;
        break;
      case RangeMode.CURRENT:
        min = currentFrame;
        max = currentFrame;
        break;
      case RangeMode.CUSTOM:
        // Clamp range values in case of unsafe input.
        // Also decrement to match 0-based indexing.
        min = clamp(customMin - 1, 0, totalFrames - 1);
        max = clamp(customMax - 1, min, totalFrames - 1);
    }

    const setFrame = async (frame: number): Promise<void> => {
      await view3d.setTime(volume, frame);
      view3d.redraw(true);
    };
    const getCanvas = (): HTMLCanvasElement => view3d.getCanvasDOMElement();
    const options: Partial<RecordingOptions> = {
      min,
      max,
      frameIncrement: rangeMode === RangeMode.CUSTOM ? frameIncrement : 1,
      fps: fps,
      minDigits: (totalFrames - 1).toString().length,
      bitrate: videoBitsPerSecond,
      prefix: imagePrefix,
      onCompleted: async () => {
        setPercentComplete(100);
        // TODO: Show success notification
        // Close the modal after a small delay so the success notification can be seen
        setIsPlayingCloseAnimation(true);
        setTimeout(() => stopRecording(true), 750);
        // Reset play axis
        playControls.pause();
        recorderRef.current = null;
      },
      onRecordedFrame: (frame: number) => {
        // Update the progress bar as frames are recorded.
        setPercentComplete(Math.floor(((frame - min) / (max - min)) * 100));
      },
      onError: (error: Error) => {
        console.error(error);
        if (recorder.isRecording()) {
          setErrorText(error.message);
          stopRecording(false);
        }
      },
    };
    if (recordingMode === RecordingMode.VIDEO_MP4) {
      recorderRef.current = new Mp4VideoRecorder(setFrame, getCanvas, options);
    } else {
      recorderRef.current = new ImageSequenceRecorder(setFrame, getCanvas, options);
    }
    const recorder = recorderRef.current;
    await setTimeout(() => {
      if (!recorderRef.current) {
        return;
      }
      recorderRef.current.start().then(() => {
        if (recorderRef.current === recorder && !isRecording) {
          // Encountered an error during startup, which will be output to the
          // onError callback.
          stopRecording(false);
        }
      });
    }, 10);
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
  const customRangeFrames = getFrameCount(customMin, customMax, frameIncrement);
  const numFrames = rangeMode === RangeMode.CUSTOM ? customRangeFrames : totalFrames;
  const totalSeconds = numFrames / fps;

  const approximateFilesizeMb = getApproximateVideoFilesizeMb(
    totalSeconds,
    videoBitsPerSecond,
    exportDimensions,
    numFrames
  );

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
          {isRecording ? "Stop" : "Record"}
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
    <div ref={modalContainerRef}>
      <Modal
        className={styles.exportModal}
        title="Recording"
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
            <Radio.Group
              className={styles.exportModeRadioGroup}
              value={recordingMode}
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
                  MP4 Video
                </Radio>
              </Tooltip>
            </Radio.Group>
          </FlexColumnAlignCenter>

          <RecordingRangeControl
            totalFrames={totalFrames}
            rangeMode={rangeMode}
            customMin={customMin}
            customMax={customMax}
            frameIncrement={frameIncrement}
            setFrameIncrement={setFrameIncrement}
            setRangeMode={setRangeMode}
            setCustomMin={setCustomMin}
            setCustomMax={setCustomMax}
            recordingMode={recordingMode}
            isRecording={isRecording}
            indentPx={RECORDING_CARD_SETTINGS_INDENT_PX}
          />

          <Card size="small" title={"Dimensions"}>
            <SettingsContainer gapPx={6} indentPx={RECORDING_CARD_SETTINGS_INDENT_PX}>
              <SettingsItem
                label="Frame dimensions"
                labelStyle={{ marginTop: "2px", height: "min-content" }}
                htmlFor={RecordingHtmlIds.FRAME_DIMENSION_WIDTH_INPUT}
              >
                <FlexColumn style={{ alignItems: "flex-start", paddingBottom: "8px" }} $gap={6}>
                  <FlexRow $gap={6}>
                    <Button
                      onClick={() => {
                        onSetDimensions(viewportDimensions as [number, number]);
                        setUseCurrentViewportSize(true);
                      }}
                      type={isViewportDimensions ? "primary" : "default"}
                    >
                      Set to viewport
                    </Button>
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
                        <InputNumber<number>
                          className={styles.dimensionInput}
                          id={RecordingHtmlIds.FRAME_DIMENSION_WIDTH_INPUT}
                          aria-label="Width"
                          value={dimensionsInput[0]}
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
                        <InputNumber<number>
                          className={styles.dimensionInput}
                          id={RecordingHtmlIds.FRAME_DIMENSION_HEIGHT_INPUT}
                          aria-label="Height"
                          value={dimensionsInput[1]}
                          onChange={handleSetHeight}
                          controls={false}
                          style={{ width: "90px" }}
                        />
                      </Space.Compact>
                      <Tooltip
                        title={aspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                        trigger={["hover", "focus"]}
                        getPopupContainer={() => exportModalRef.current || document.body}
                      >
                        <Button
                          type={aspectRatio ? "primary" : "link"}
                          // sizePx={26}
                          onClick={() => setAspectRatio(aspectRatio ? null : dimensionsInput[0] / dimensionsInput[1])}
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
                  id={RecordingHtmlIds.FINAL_DIMENSIONS_TEXT}
                >{`${exportDimensions[0]} × ${exportDimensions[1]}`}</p>
              </SettingsItem>
            </SettingsContainer>
          </Card>

          <SettingsContainer indentPx={RECORDING_SETTINGS_INDENT_PX} gapPx={6}>
            {/* Video settings */}
            {recordingMode === RecordingMode.VIDEO_MP4 && (
              <>
                <SettingsItem label="Frames per second" htmlFor={RecordingHtmlIds.FPS_INPUT}>
                  <FlexRowAlignCenter $gap={6} style={{ alignItems: "center", paddingTop: 4 }}>
                    <InputNumber
                      id={RecordingHtmlIds.FPS_INPUT}
                      value={fps}
                      onChange={(value) => value !== null && Number.isFinite(value) && setFps(Math.max(0, value))}
                      min={1}
                      max={120}
                      disabled={isRecording}
                      width="175px"
                    />
                    <p className={styles.hintText}>({getDurationLabel(totalSeconds)})</p>
                  </FlexRowAlignCenter>
                </SettingsItem>
                <SettingsItem label="Video quality" htmlFor={RecordingHtmlIds.VIDEO_QUALITY_RADIO}>
                  <FlexRowAlignCenter $gap={6}>
                    <Radio.Group
                      className={styles.videoQualityRadioGroup}
                      id={RecordingHtmlIds.VIDEO_QUALITY_RADIO}
                      disabled={isRecording}
                      options={videoQualityOptions}
                      optionType="button"
                      value={videoBitsPerSecond}
                      onChange={(e) => setVideoBitsPerSecond(e.target.value)}
                    />
                    <p className={styles.hintText}>(~{approximateFilesizeMb})</p>
                  </FlexRowAlignCenter>
                </SettingsItem>
              </>
            )}
            {/* Filename prefix */}
            <SettingsItem label={"Filename"} htmlFor={RecordingHtmlIds.IMAGE_FILENAME_INPUT}>
              <FlexRowAlignCenter $gap={6}>
                <Input
                  id={RecordingHtmlIds.IMAGE_FILENAME_INPUT}
                  onChange={(event) => {
                    setImagePrefixInput(event.target.value);
                    setUseDefaultImagePrefix(false);
                  }}
                  value={imagePrefix}
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
  );
}
