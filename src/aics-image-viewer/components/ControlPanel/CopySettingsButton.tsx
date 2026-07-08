import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps, Tooltip } from "antd";
import React from "react";

import {
  channelStateToClipboard,
  clipboardToChannelState,
  isClipboardChannelState,
} from "../../shared/utils/parseClipboard";
import { useViewerState } from "../../state/store";

import { useContextualAlert } from "../shared/ContextualAlert";

const CopySettingsButton: React.FC<{ scrollContainer?: HTMLElement | null; hide?: boolean }> = ({
  scrollContainer,
  hide,
}) => {
  const [pasteDenied, setPasteDenied] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [alert, showMessage] = useContextualAlert(buttonRef.current, { scrollContainer, hide, timeout: 8_000 });

  /** Learn as much as we can about whether the "paste" action will succeed, so we can disable it in advance. */
  const queryPasteState = React.useCallback(async (): Promise<void> => {
    let permission: PermissionStatus;
    try {
      // Chromium browsers: we can query permissions to learn whether a clipboard read will succeed
      permission = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
      // If we're here, the `clipboard-read` permission is supported. Its state may be `denied`, `granted`, or `prompt`.
      setPasteDenied(permission.state === "denied");
    } catch {
      // Non-Chromium browsers: clipboard reads don't have stateful permissions and will always require a prompt
      setPasteDenied(false);
    }
  }, []);

  // Update our guess about whether pasting will succeed on mount and whenever the clipboard changes.
  React.useEffect(() => {
    queryPasteState();
    // This event only exists in Chromium browsers, but `queryPasteState` only works in Chromium browsers anyways
    navigator.clipboard.addEventListener("clipboardchange", queryPasteState);
    return () => navigator.clipboard.removeEventListener("clipboardchange", queryPasteState);
  }, [queryPasteState]);

  const pastePrompt = pasteDenied && (
    <Tooltip title="You must grant access to the clipboard" placement="right">
      <ExclamationCircleOutlined />
    </Tooltip>
  );

  const items: MenuProps["items"] = [
    {
      key: 0,
      label: "Copy",
      onClick: async () => {
        try {
          const { channelSettings } = useViewerState.getState();
          navigator.clipboard.writeText(JSON.stringify(channelStateToClipboard(channelSettings)));
          showMessage("Settings copied");
        } catch {
          showMessage("Could not copy settings", "error");
        }
      },
    },
    { key: 1, label: "Export" },
    {
      key: 2,
      label: (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Paste</span>
          {pastePrompt}
        </div>
      ),
      disabled: pasteDenied,
      onClick: async () => {
        const { channelSettings, replaceAllChannelSettings } = useViewerState.getState();
        try {
          const clipboard = await navigator.clipboard.readText();
          const parsed = JSON.parse(clipboard);
          if (!isClipboardChannelState(parsed)) {
            return;
          }
          const deserialized = clipboardToChannelState(parsed);

          const nextState = channelSettings.map((state) => ({
            ...state,
            ...deserialized[state.name],
          }));
          replaceAllChannelSettings(nextState);
          showMessage(
            <>
              Settings applied -{" "}
              <Button type="link" style={{ padding: 0, height: "unset" }}>
                Undo
              </Button>
            </>
          );
        } catch {
          showMessage("Could not apply settings", "error");
          // If paste failed, check if it was because the user was asked to grant clipboard access and said no
          queryPasteState();
        }
      },
    },
    { key: 3, label: "Import" },
  ];

  return (
    <>
      <Dropdown menu={{ items }} trigger={["click"]} overlayStyle={{ minWidth: 100 }}>
        <Button type="text" size="large" ref={buttonRef}>
          <EllipsisOutlined />
        </Button>
      </Dropdown>
      {alert}
    </>
  );
};

export default CopySettingsButton;
