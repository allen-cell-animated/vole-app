import { Button, Drawer } from "antd";
import React, { useEffect, useState } from "react";

import ViewerIcon from "../shared/ViewerIcon";

import "./styles.css";

type BottomPanelProps = {
  title?: string;
  onVisibleChange?: (visible: boolean) => void;
  onVisibleChangeEnd?: (visible: boolean) => void;
  children?: React.ReactNode;
  height?: number;
};

const BottomPanel: React.FC<BottomPanelProps> = ({ children, title, height, onVisibleChange, onVisibleChangeEnd }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Call `onVisibleChange` on mount
  useEffect(() => {
    onVisibleChange?.(isVisible);
    if (!isVisible) {
      onVisibleChangeEnd?.(isVisible);
    }
  });

  // Treat changes in height as a change in visibility if the panel is open
  useEffect(() => {
    onVisibleChange?.(isVisible);
    window.setTimeout(() => onVisibleChangeEnd?.(isVisible), 300);
  }, [height]);

  const toggleDrawer = (): void => {
    setIsVisible(!isVisible);
    if (onVisibleChange) {
      onVisibleChange(!isVisible);
    }
  };

  const optionsButton = (
    <Button className="options-button" size="small" onClick={toggleDrawer}>
      {title || "Options"}
      <ViewerIcon type="closePanel" className="button-arrow" style={{ fontSize: "15px" }} />
    </Button>
  );

  return (
    <div className="bottom-panel">
      <Drawer
        className="drawer"
        placement="bottom"
        closable={false}
        getContainer={false}
        open={isVisible}
        mask={false}
        title={optionsButton}
        afterOpenChange={onVisibleChangeEnd}
        height={height ?? 190}
      >
        <div className="drawer-body-wrapper">{children}</div>
      </Drawer>
    </div>
  );
};

export default BottomPanel;
