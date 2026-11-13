import { CloseCircleFilled } from "@ant-design/icons";
import { Button, Popconfirm, Tooltip } from "antd";
import React, { type ReactElement, useState } from "react";

import "./ResetButton.style.css";

type ResetButtonProps = {
  label: string;
  tooltip: string;
  popupTitle: string;
  popupDescription: string;
  onConfirm: () => void;
};

/**
 * Renders a red reset button with a confirmation popup.
 */
export default function ResetButton(props: ResetButtonProps): ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div ref={containerRef} className="reset-button">
      <Tooltip
        trigger={["hover", "focus"]}
        placement="right"
        title={props.tooltip}
        // Disable tooltip when popup is open
        open={isPopupOpen ? false : undefined}
      >
        <Popconfirm
          open={isPopupOpen}
          onOpenChange={setIsPopupOpen}
          title={<span style={{ fontSize: "16px" }}>{props.popupTitle}</span>}
          onConfirm={props.onConfirm}
          description={
            <p style={{ maxWidth: "300px", wordWrap: "break-word", fontSize: "14px", margin: 0 }}>
              {props.popupDescription}
            </p>
          }
          icon={<CloseCircleFilled />}
          okButtonProps={{ danger: true }}
          okText="Reset"
          getPopupContainer={() => containerRef.current ?? document.body}
          placement="topLeft"
          style={{ marginLeft: "10px" }}
        >
          <Button danger>{props.label}</Button>
        </Popconfirm>
      </Tooltip>
    </div>
  );
}
