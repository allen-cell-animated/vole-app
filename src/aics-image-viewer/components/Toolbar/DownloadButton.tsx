import { Button, Dropdown, type MenuProps, Tooltip } from "antd";
import React from "react";

import ViewerIcon from "../shared/ViewerIcon";

interface DownloadButtonProps {
  cellDownloadHref: string;
  fovDownloadHref: string;
  hasFov: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ fovDownloadHref, cellDownloadHref, hasFov }) => {
  if (hasFov) {
    const menu: MenuProps = {
      className: "download-dropdown",
      items: [
        {
          key: "1",
          label: (
            <a href={cellDownloadHref}>
              <ViewerIcon type="download" /> Segmented cell
            </a>
          ),
        },
        {
          key: "2",
          label: (
            <a href={fovDownloadHref}>
              <ViewerIcon type="download" /> Full field image
            </a>
          ),
        },
      ],
    };
    return (
      <Tooltip trigger={["hover", "focus"]} placement="bottom" title={"Download volume data"}>
        <Dropdown menu={menu} placement="bottomRight" trigger={["click"]}>
          <Button className="ant-btn-icon-only btn-borderless">
            <ViewerIcon type="download" />
          </Button>
        </Dropdown>
      </Tooltip>
    );
  } else if (cellDownloadHref) {
    return (
      <Tooltip trigger={["hover", "focus"]} placement="bottom" title={"Download volume data"}>
        <Button className="ant-btn-icon-only btn-borderless" href={cellDownloadHref}>
          <ViewerIcon type="download" />
        </Button>
      </Tooltip>
    );
  } else {
    return null;
  }
};

export default DownloadButton;
