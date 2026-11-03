import type { View3d, Volume } from "@aics/vole-core";
import { VideoCameraOutlined } from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import React, { type ReactElement, useRef, useState } from "react";

import { useViewerState } from "../../../state/store";

import Mp4VideoRecorder from "../../../shared/utils/recorders/Mp4VideoRecorder";

type RecordingButtonProps = {
  view3d: View3d;
  volume: Volume | null;
};

export default function RecordingButton(props: RecordingButtonProps): ReactElement {
  const originalFrame = useRef(0);

  // Store initial time on modal open so it can be restored on close.
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const setIsModalOpen = (open: boolean): void => {
    if (open === isModalOpen) {
      return;
    }
    _setIsModalOpen(open);
    if (open) {
      originalFrame.current = useViewerState.getState().time;
    } else if (props.volume) {
      props.view3d.setTime(props.volume, originalFrame.current);
    }
  };

  const [isRecording, setIsRecording] = useState(false);

  const handleCancel = (): void => {
    setIsModalOpen(false);
  };

  const handleRecord = (): void => {
    const volume = props.volume;
    if (!volume) {
      return;
    }
    setIsRecording(true);

    const recorder = new Mp4VideoRecorder(
      async (frame: number) => {
        await props.view3d.setTime(volume, frame);
        props.view3d.redraw(true);
      },
      () => props.view3d.getCanvasDOMElement(),
      {
        min: 0,
        max: 10,
        fps: 1,
        onRecordedFrame: (frame: number) => {
          console.log(`Recorded frame: ${frame}`);
        },
        onCompleted: async () => {
          setIsRecording(false);
        },
      }
    );
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
      <Modal open={isModalOpen} onCancel={handleCancel}>
        <Button type="primary" onClick={handleRecord} disabled={isRecording}>
          Record
        </Button>
      </Modal>
    </div>
  );
}
