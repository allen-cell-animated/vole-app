import type { View3d, Volume } from "@aics/vole-core";
import { VideoCameraOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React, { type ReactElement, useState } from "react";

import { TOOLTIP_TRIGGER } from "../../shared/constants";
import type PlayControls from "../../shared/utils/playControls";

import RecordingModal from "./RecordingModal";

type RecordingButtonProps = {
  view3d: View3d;
  volume: Volume | null;
  playControls: PlayControls;
  setCanvasResolution: (resolution: [number, number] | null) => void;
};

export default function RecordingButton(props: RecordingButtonProps): ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <Tooltip placement="bottom" title="Record" trigger={TOOLTIP_TRIGGER}>
        <Button
          className="ant-btn-icon-only btn-borderless"
          onClick={() => setIsModalOpen(true)}
          disabled={!props.volume}
        >
          <VideoCameraOutlined />
        </Button>
      </Tooltip>

      {props.volume && (
        <RecordingModal
          open={isModalOpen}
          setIsOpen={setIsModalOpen}
          view3d={props.view3d}
          volume={props.volume}
          playControls={props.playControls}
          setCanvasResolution={props.setCanvasResolution}
        />
      )}
    </div>
  );
}
