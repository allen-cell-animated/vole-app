import { Button, Drawer } from "antd";
import React, { useCallback, useEffect, useState } from "react";

import ViewerIcon from "../shared/ViewerIcon";

import "./styles.css";

type BottomPanelProps = {
  contents: { title: string; children: React.ReactNode }[];
  open?: boolean;
  pageIndex?: number;
  onPageChange?: (page: number | null) => void;
  height?: number;
};

const BottomPanel: React.FC<BottomPanelProps> = ({
  contents,
  open: openProp,
  pageIndex: pageProp,
  height,
  onPageChange,
}) => {
  const [openState, setOpenState] = useState(true);
  const [pageState, setPageState] = useState(0);
  const open = openProp ?? openState;
  const page = pageProp ?? pageState;

  const setPage = useCallback(
    (index: number): void => {
      const nextOpen = !open || index !== page;

      if (openProp === undefined) {
        setOpenState(nextOpen);
      }
      if (pageProp === undefined) {
        setPageState(index);
      }

      onPageChange?.(nextOpen ? index : null);
    },
    [open, openProp, page, pageProp, onPageChange]
  );

  // If length of `contents` decreases, ensure we're still on a valid page
  useEffect(() => {
    if (page >= contents.length && contents.length > 0) {
      const nextPage = contents.length - 1;

      if (pageProp === undefined) {
        setPageState(nextPage);
      }

      onPageChange?.(open ? nextPage : null);
    }
  }, [contents.length, onPageChange, open, page, pageProp]);

  const optionsButton = (
    <div className="options-button-container">
      {contents
        .map(({ title }, index) => (
          <Button
            key={index}
            className={open && page === index ? "options-button button-open" : "options-button"}
            size="small"
            onClick={() => setPage(index)}
          >
            {title || "Options"}
            <ViewerIcon type="closePanel" className="button-arrow" style={{ fontSize: "15px" }} />
          </Button>
        ))
        .reverse()}
    </div>
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
        <div className="drawer-body-wrapper">{open !== null && page < contents.length && contents[page].children}</div>
      </Drawer>
    </div>
  );
};

export default BottomPanel;
