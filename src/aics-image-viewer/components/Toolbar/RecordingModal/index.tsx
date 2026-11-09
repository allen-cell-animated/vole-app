import type { View3d, Volume } from "@aics/vole-core";
import { Button, Card, Input, InputNumber, Modal, Radio, Tooltip } from "antd";
import React, { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TOOLTIP_TRIGGER } from "../../../shared/constants";
import { clamp } from "../../../shared/utils/math";
import type PlayControls from "../../../shared/utils/playControls";
import { select, useViewerState } from "../../../state/store";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "../../shared/utils";
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

const enum RecordingHtmlIds {
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
};

export enum VideoBitrate {
  HIGH = 1e8, // 100 Mbps
  MEDIUM = 1e7, // 10 Mbps
  LOW = 5e6, // 5 Mbps
}

const RECORDING_CARD_SETTINGS_INDENT_PX = 5;
const RECORDING_SETTINGS_INDENT_PX = 18;

// MARK: Helpers

function getPixelRatio(): number {
  return window.devicePixelRatio || 1;
}

export default function RecordingModal(props: RecordingModalProps): ReactElement {
  //////////////////////////////////////////////////////////
  //// MARK: State
  //////////////////////////////////////////////////////////

  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  const originalFrameRef = useRef(0);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const exportModalRef = useRef<HTMLDivElement | null>(null);

  // Store the original frame on close.
  const { open: isModalOpen, setIsOpen: _setIsModalOpen } = props;
  const setIsModalOpen = useCallback(
    (open: boolean): void => {
      if (!open) {
        props.view3d.setTime(props.volume, originalFrameRef.current);
      }
      _setIsModalOpen(open);
    },
    [_setIsModalOpen, props.view3d, props.volume]
  );

  // On open, save the current frame so it can be restored on modal close.
  useEffect(() => {
    if (isModalOpen) {
      props.playControls.pause();
      setErrorText("");
      originalFrameRef.current = useViewerState.getState().time;
      // Disable auto-rotation
      changeViewerSetting("autorotate", false);
    }
  }, [isModalOpen, changeViewerSetting, props.playControls]);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingCloseAnimation, setIsPlayingCloseAnimation] = useState(false);
  const [percentComplete, setPercentComplete] = useState(0);
  const recorderRef = useRef<CanvasRecorder | null>(null);
  const [errorText, setErrorText] = useState("");
  const [recordingMode, _setRecordingMode] = useState(RecordingMode.IMAGE_SEQUENCE);

  //// Frame range
  const totalFrames = props.volume.imageInfo.times;
  const [rangeMode, setRangeMode] = useState(RangeMode.ALL);
  // Uses 1-based indexing to match rest of Vol-E UI.
  const [customMin, setCustomMin] = useState(1);
  const [customMax, setCustomMax] = useState(totalFrames);
  const [frameIncrement, setFrameIncrement] = useState(1);

  //// Resolution and dimensions
  const pixelRatio = getPixelRatio();
  const [viewportDimensions, setViewportDimensions] = useState([0, 0]);

  /** Final size of the exported image/video frame, based on current options. */
  const exportDimensions = useMemo((): [number, number] => {
    const exportDimensions: [number, number] = [
      Math.floor(viewportDimensions[0] * pixelRatio),
      Math.floor(viewportDimensions[1] * pixelRatio),
    ];
    return exportDimensions;
  }, [viewportDimensions, pixelRatio]);

  //// Image prefix
  const defaultImagePrefix = useMemo(() => {
    const volume = props.volume;
    return `${volume.imageInfo.imageInfo.name}-${exportDimensions[0]}x${exportDimensions[1]}`;
  }, [exportDimensions, props.volume]);

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
    const maxFrame = props.volume.imageInfo.times;
    setCustomMin((min) => clamp(min, 0, maxFrame));
    setCustomMax((max) => clamp(max, 0, maxFrame));
  }, [props.volume]);

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
  }, [props.view3d]);

  //////////////////////////////////////////////////////////
  //// MARK: Callbacks
  //////////////////////////////////////////////////////////

  const stopRecording = useCallback(
    async (closeModal: boolean): Promise<void> => {
      recorderRef.current?.abort();
      // Reset the frame number (clean up!)
      await props.view3d.setTime(props.volume, originalFrameRef.current);
      setIsRecording(false);
      recorderRef.current = null;
      setIsPlayingCloseAnimation(false);
      setPercentComplete(0);
      props.playControls.pause();
      if (closeModal) {
        setIsModalOpen(false);
      }
    },
    [props.view3d, props.volume, props.playControls, setIsModalOpen]
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

  const handleStartRecord = (): void => {
    const volume = props.volume;
    if (!volume) {
      return;
    }
    setErrorText("");
    setIsRecording(true);

    // TODO: Set explicit scale level here, otherwise the playback will drop
    // to a lower resolution.
    // Set play axis to t for prefetching.
    props.playControls.playingAxis = "t";
    props.playControls?.onPlayingAxisChanged?.("t");

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
      await props.view3d.setTime(volume, frame);
      props.view3d.redraw(true);
    };
    const getCanvas = (): HTMLCanvasElement => props.view3d.getCanvasDOMElement();
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
    if (recordingMode === RecordingMode.VIDEO_MP4) {
      recorderRef.current = new Mp4VideoRecorder(setFrame, getCanvas, options);
    } else {
      recorderRef.current = new ImageSequenceRecorder(setFrame, getCanvas, options);
    }
    const recorder = recorderRef.current;
    recorderRef.current.start().then(() => {
      if (recorderRef.current === recorder && !isRecording) {
        // Encountered an error during startup, which will be output to the
        // onError callback.
        stopRecording(false);
      }
    });
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
