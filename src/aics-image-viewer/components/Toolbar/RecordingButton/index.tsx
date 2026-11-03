import { View3d, Volume } from "@aics/vole-core";
import { VideoCameraOutlined } from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import { ReactElement, useRef, useState } from "react";

import { useViewerState } from "../../../state/store";

import Mp4VideoRecorder from "../../../shared/utils/recorders/Mp4VideoRecorder";

type RecordingButtonProps = {
  view3d: View3d;
  volume: Volume | null;
};

export default function RecordingButton(props: RecordingButtonProps): ReactElement {
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const time = useViewerState((state) => state.time);
  const originalFrame = useRef(0);

  props.view3d.getCanvasDOMElement();

  // Store initial time on modal open so it can be restored on close.
  const setIsModalOpen = (open: boolean) => {
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

  const totalFrames = props.volume?.imageInfo.times ?? 0;

  const handleCancel = () => {};

  const handleRecord = () => {
    const volume = props.volume;
    if (!volume) {
      return;
    }
    setIsRecording(true);

    // const view3dSize = props.view3d.getCanvasDOMElement().getBoundingClientRect();

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
      <Tooltip placement="bottom" title="Screenshot">
        <Button className="ant-btn-icon-only btn-borderless" onClick={() => setIsModalOpen(true)}>
          <VideoCameraOutlined />
        </Button>
      </Tooltip>

      {/* Export modal1 */}
      <Modal open={isModalOpen} onCancel={() => setIsModalOpen(false)}>
        <Button type="primary" onClick={handleRecord} disabled={isRecording}>
          Record
        </Button>
      </Modal>
    </div>
  );
}
