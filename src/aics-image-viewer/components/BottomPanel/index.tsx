import { Button, Drawer } from "antd";
import React, { useCallback, useState } from "react";

import ViewerIcon from "../shared/ViewerIcon";

import "./styles.css";

type BottomPanelProps = {
  title?: string;
  open?: boolean;
  onOpenChange?: (visible: boolean) => void;
  children?: React.ReactNode;
  height?: number;
};

const BottomPanel: React.FC<BottomPanelProps> = ({ children, open: openProp, title, height, onOpenChange }) => {
  const [openState, setOpenState] = useState(true);
  const open = openProp ?? openState;

  const toggleDrawer = useCallback((): void => {
    if (openProp === undefined) {
      setOpenState(!open);
    }

    onOpenChange?.(!open);
  }, [open, openProp, onOpenChange]);

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
        open={open}
        mask={false}
        title={optionsButton}
        height={height ?? 190}
      >
        <div className="drawer-body-wrapper">{children}</div>
      </Drawer>
    </div>
  );
};

export default BottomPanel;
