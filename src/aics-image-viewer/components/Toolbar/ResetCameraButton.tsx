import { Button, Tooltip } from "antd";
import React from "react";

import ViewerIcon from "../shared/ViewerIcon";

type ResetCameraButtonProps = {
  resetCamera: () => void;
};

const ResetCameraButton: React.FC<ResetCameraButtonProps> = (props) => {
  return (
    <Tooltip placement="bottom" title="Reset camera">
      <Button className="ant-btn-icon-only btn-borderless" onClick={props.resetCamera}>
        <ViewerIcon type="resetView" />
      </Button>
    </Tooltip>
  );
};

export default ResetCameraButton;
