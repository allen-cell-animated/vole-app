import type { View3d, Volume } from "@aics/vole-core";
import { VideoCameraOutlined } from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import React, { type ReactElement, useRef, useState } from "react";

import PlayControls from "../../../shared/utils/playControls";
import { useViewerState } from "../../../state/store";

import Mp4VideoRecorder from "../../../shared/utils/recorders/Mp4VideoRecorder";

type RecordingButtonProps = {
  view3d: View3d;
  volume: Volume | null;
  playControls: PlayControls;
};

export default function RecordingButton(props: RecordingButtonProps): ReactElement {
  const originalFrame = useRef(0);
  const recorderRef = useRef<Mp4VideoRecorder | null>(null);

  // Store initial time on modal open so it can be restored on close.
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const setIsModalOpen = (open: boolean): void => {
    if (open === isModalOpen) {
      return;
    }
    _setIsModalOpen(open);
    if (open) {
      props.playControls.pause();
      originalFrame.current = useViewerState.getState().time;
    } else if (props.volume) {
      props.view3d.setTime(props.volume, originalFrame.current);
    }
  };

  const [isRecording, setIsRecording] = useState(false);

  const handleCancel = (): void => {
    setIsModalOpen(false);
    setIsRecording(false);
    props.playControls.pause();
    if (recorderRef.current && recorderRef.current.isRecording()) {
      recorderRef.current.abort();
      recorderRef.current = null;
    }
  };

  const handleRecord = (): void => {
    const volume = props.volume;
    if (!volume) {
      return;
    }
    setIsRecording(true);

    // Set play axis to t for prefetching.
    props.playControls.playingAxis = "t";
    props.playControls?.onPlayingAxisChanged?.("t");

    const recorder = new Mp4VideoRecorder(
      async (frame: number) => {
        await props.view3d.setTime(volume, frame);
        props.view3d.redraw(true);
      },
      () => props.view3d.getCanvasDOMElement(),
      // TODO: set to real user-defined values
      {
        min: 0,
        max: 9,
        fps: 1,
        onRecordedFrame: (_frame: number) => {},
        onCompleted: async () => {
          setIsRecording(false);
          recorderRef.current = null;
          // Clear play axis
          props.playControls.pause();
        },
      }
    );
    recorderRef.current = recorder;
    recorder.start();
  };

  return (
    <div>
      <Tooltip placement="bottom" title="Record">
        <Button className="ant-btn-icon-only btn-borderless" onClick={() => setIsModalOpen(true)}>
          <VideoCameraOutlined />
        </Button>
      </Tooltip>

      {/* Export modal */}
      <Modal open={isModalOpen} onCancel={handleCancel} footer={null}>
        <Button type="primary" onClick={handleRecord} disabled={isRecording}>
          Record
        </Button>
      </Modal>
    </div>
  );
}
