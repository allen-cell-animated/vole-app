import type { View3d, Volume } from "@aics/vole-core";
import { VideoCameraOutlined } from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import React, { type ReactElement, useCallback, useRef, useState } from "react";
import styled from "styled-components";

import { clamp } from "../../../shared/utils/math";
import type PlayControls from "../../../shared/utils/playControls";
import { useViewerState } from "../../../state/store";

import { RecordingOptions } from "../../../shared/utils/recorders/CanvasRecorder";
import Mp4VideoRecorder from "../../../shared/utils/recorders/Mp4VideoRecorder";
import StyledInlineProgress from "../../shared/StyledInlineProgress";

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

export enum VideoBitrate {
  HIGH = 1e8, // 100 Mbps
  MEDIUM = 1e7, // 10 Mbps
  LOW = 5e6, // 5 Mbps
}

const VerticalDiv = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const HorizontalDiv = styled.div`
  display: flex;
  flex-direction: row;
  gap: 6px;
  flex-wrap: wrap;
`;

export default function RecordingButton(props: RecordingButtonProps): ReactElement {
  //// MARK: State
  const originalFrameRef = useRef(0);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

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

  const totalFrames = props.volume?.imageInfo.times ?? 0;

  const [fps, setFps] = useState(12);
  const [videoBitsPerSecond, setVideoBitsPerSecond] = useState(VideoBitrate.MEDIUM);

  // TODO: Store these settings to local storage so they persist?
  const [rangeMode, setRangeMode] = useState(RangeMode.ALL);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(totalFrames - 1);

  const recorderRef = useRef<Mp4VideoRecorder | null>(null);

  const [errorText, setErrorText] = useState("");

  //// MARK: Callbacks

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

  //// MARK: Rendering

  // Footer for the Export modal.
  // Layout: Optional Progress meter - Export/Stop Button - Cancel Button
  const modalFooter = (
    <VerticalDiv>
      <HorizontalDiv style={{ alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
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
      </HorizontalDiv>
      <div>
        {errorText && (
          <p style={{ color: "var(--color-text-error)", textAlign: "left", textWrap: "wrap" }}>{errorText}</p>
        )}
      </div>
    </VerticalDiv>
  );

  return (
    <div ref={modalContainerRef}>
      <Tooltip placement="bottom" title="Record">
        <Button className="ant-btn-icon-only btn-borderless" onClick={() => setIsModalOpen(true)}>
          <VideoCameraOutlined />
        </Button>
      </Tooltip>

      {/* Export modal */}
      <Modal
        title="Export video"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={modalFooter}
        getContainer={() => modalContainerRef.current ?? document.body}
      ></Modal>
    </div>
  );
}
