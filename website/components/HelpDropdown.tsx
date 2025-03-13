import { Button, Dropdown, MenuProps, Modal } from "antd";
import React, { ReactElement, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { DropdownSVG } from "../assets/icons";
import { FlexColumnAlignCenter, FlexRowAlignCenter } from "./LandingPage/utils";

import { SecondaryButton } from "./Buttons";

// Defined in webpack config
declare const VOLEAPP_VERSION: string;
declare const VOLECORE_VERSION: string;

export default function HelpDropdown(): ReactElement {
  const [container, setContainer] = useState<HTMLDivElement | null>();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [showVersionModal, setShowVersionModal] = useState(false);

  const items: MenuProps["items"] = [
    {
      key: "github",
      label: (
        <Link to="https://github.com/allen-cell-animated/vole-app" target="_blank" rel="noreferrer noopener">
          Visit GitHub repository
        </Link>
      ),
    },
    {
      key: "github-issue",
      label: (
        <Link
          to="https://github.com/allen-cell-animated/vole-app/issues/new/choose"
          target="_blank"
          rel="noreferrer noopener"
        >
          Report issue via GitHub
        </Link>
      ),
    },
    {
      key: "forum",
      label: (
        <Link to="https://forum.allencell.org/c/software-code/11" target="_blank" rel="noreferrer noopener">
          Allen Cell Discussion Forum
        </Link>
      ),
    },
    {
      key: "version",
      label: "Version info",
      onClick: () => {
        setShowVersionModal(true);
      },
    },
  ];

  // Use state update here to force a re-render so Dropdown is rendered with a valid `getContainer` callback.
  // Otherwise, the `getContainer` callback will be undefined on the first render.
  useEffect(() => {
    setContainer(containerRef.current);
  }, [containerRef.current]);
  const getContainer = container !== null ? () => container! : undefined;

  const closeVersionModal = (): void => setShowVersionModal(false);

  return (
    <div ref={containerRef}>
      <Dropdown menu={{ items: items }} getPopupContainer={getContainer} trigger={["click"]}>
        <SecondaryButton>
          <FlexRowAlignCenter $gap={6}>
            Help <DropdownSVG />
          </FlexRowAlignCenter>
        </SecondaryButton>
      </Dropdown>
      <Modal
        open={showVersionModal}
        title="Version info"
        getContainer={getContainer}
        onCancel={() => setShowVersionModal(false)}
        footer={<Button onClick={closeVersionModal}>Close</Button>}
      >
        <FlexColumnAlignCenter $gap={0}>
          <p style={{ margin: 0 }}>Vol-E App v{VOLEAPP_VERSION}</p>
          <p style={{ margin: 0 }}>Vol-E Core package v{VOLECORE_VERSION}</p>
        </FlexColumnAlignCenter>
      </Modal>
    </div>
  );
}
