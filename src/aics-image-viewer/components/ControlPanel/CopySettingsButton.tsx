import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps, Tooltip } from "antd";
import React from "react";

import {
  channelStateToClipboard,
  clipboardToChannelState,
  isClipboardChannelState,
} from "../../shared/utils/parseClipboard";
import { useViewerState } from "../../state/store";
import { cloneChannelState } from "../../state/util";

import { useContextualAlert } from "../shared/ContextualAlert";

const CopySettingsButton: React.FC<{
  scrollContainer?: HTMLElement | null;
  hide?: boolean;
  getDropdownContainer?: () => HTMLElement;
}> = ({ scrollContainer, hide, getDropdownContainer }) => {
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

  const firstRenderRef = React.useRef(false);
  if (firstRenderRef.current) {
    queryPasteState();
    firstRenderRef.current = true;
  }

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
    // { key: 1, label: "Export" },
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

        // Try to read the clipboard
        let clipboard: string | undefined = undefined;
        try {
          clipboard = await navigator.clipboard.readText();
        } catch {
          showMessage("Could not read clipboard", "error");
          // If paste failed, check if it was because the user was asked to grant clipboard access and said no
          queryPasteState();
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(clipboard);
        } catch {
          parsed = undefined;
        }
        if (!isClipboardChannelState(parsed)) {
          showMessage("Clipboard does not contain channel settings", "error");
          return;
        }

        const newStates = clipboardToChannelState(parsed);
        const newStatesCount = Object.keys(newStates).length;
        const currentStates = channelSettings.map(cloneChannelState);
        const nextStates = channelSettings.map((state) => {
          const result = {
            ...cloneChannelState(state),
            ...newStates[state.name],
          };
          delete newStates[state.name];
          return result;
        });

        replaceAllChannelSettings(nextStates);

        const undo = (): void => {
          replaceAllChannelSettings(currentStates);
          showMessage(undefined);
        };

        const unmatchedStates = Object.keys(newStates);

        if (unmatchedStates.length > 0) {
          if (unmatchedStates.length === newStatesCount) {
            showMessage("No channel names matched", "error");
          } else {
            const unmatchedCount = unmatchedStates.length;
            const matchedCount = newStatesCount - unmatchedCount;
            showMessage(
              <>
                <div>
                  Settings applied to {matchedCount} channel{matchedCount > 1 ? "s" : ""} -{" "}
                  <Button type="link" style={{ padding: 0, height: "unset" }} onClick={undo}>
                    Undo
                  </Button>
                </div>
                <p>
                  {unmatchedCount} channel name{unmatchedCount > 1 ? "s" : ""} from clipboard did not match:
                </p>
                <ul>
                  {unmatchedStates.map((channelName, index) => (
                    <li key={index}>{channelName}</li>
                  ))}
                </ul>
              </>,
              "warning"
            );
          }
        } else {
          showMessage(
            <>
              Settings applied to {newStatesCount} channel{newStatesCount > 1 ? "s" : ""} -{" "}
              <Button type="link" style={{ padding: 0, height: "unset" }} onClick={undo}>
                Undo
              </Button>
            </>
          );
        }
      },
    },
    // { key: 3, label: "Import" },
  ];

  return (
    <>
      <Dropdown
        menu={{ items }}
        trigger={["click"]}
        overlayStyle={{ minWidth: 100 }}
        getPopupContainer={getDropdownContainer}
      >
        <Button type="text" size="large" ref={buttonRef}>
          <EllipsisOutlined />
        </Button>
      </Dropdown>
      {alert}
    </>
  );
};

export default CopySettingsButton;
