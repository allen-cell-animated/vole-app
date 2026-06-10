import type { View3d } from "@aics/vole-core";
import { Button, Popover, Tooltip } from "antd";
import React from "react";

import { ViewMode } from "../../shared/enums";
import { useCameraJumpCallback } from "../../shared/utils/camera";

import ViewerIcon from "../shared/ViewerIcon";

type ResetCameraButtonProps = {
  view3d: View3d;
  viewMode: ViewMode;
  resetCamera: () => void;
};

const ResetCameraButton: React.FC<ResetCameraButtonProps> = ({ view3d, viewMode, resetCamera }) => {
  const jumpXMinus = useCameraJumpCallback(view3d, "x", true, true);
  const jumpXPlus = useCameraJumpCallback(view3d, "x", false, true);
  const jumpYMinus = useCameraJumpCallback(view3d, "y", true);
  const jumpYPlus = useCameraJumpCallback(view3d, "y", false);
  const jumpZMinus = useCameraJumpCallback(view3d, "z", true, true);
  const jumpZPlus = useCameraJumpCallback(view3d, "z", false, true);

  const button = (
    <Button className="ant-btn-icon-only btn-borderless" onClick={resetCamera}>
      <ViewerIcon type="resetView" />
    </Button>
  );

  if (viewMode === ViewMode.threeD) {
    const jumpButtons = (
      <Button.Group>
        <Button onClick={jumpXMinus}>-X</Button>
        <Button onClick={jumpXPlus}>+X</Button>
        <Button onClick={jumpYMinus}>-Y</Button>
        <Button onClick={jumpYPlus}>+Y</Button>
        <Button onClick={jumpZMinus}>-Z</Button>
        <Button onClick={jumpZPlus}>+Z</Button>
      </Button.Group>
    );
    return (
      <Popover placement="bottom" content={jumpButtons}>
        {button}
      </Popover>
    );
  } else {
    return (
      <Tooltip placement="bottom" title="Reset camera">
        {button}
      </Tooltip>
    );
  }
};

export default ResetCameraButton;
