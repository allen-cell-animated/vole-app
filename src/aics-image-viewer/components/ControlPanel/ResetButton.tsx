import { CloseCircleFilled } from "@ant-design/icons";
import { Button, Popconfirm, Tooltip } from "antd";
import React, { type ReactElement } from "react";

type ResetButtonProps = {
  label: string;
  tooltip: string;
  popupTitle: string;
  popupDescription: string;
  onConfirm: () => void;
};

export default function ResetButton(props: ResetButtonProps): ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef}>
      <Tooltip trigger={["hover", "focus"]} placement="right" title={props.tooltip}>
        <Popconfirm
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
          <Button danger={true}>{props.label}</Button>
        </Popconfirm>
      </Tooltip>
    </div>
  );
}
