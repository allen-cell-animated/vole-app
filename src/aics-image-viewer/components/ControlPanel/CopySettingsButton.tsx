import { DragOutlined, EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps, Modal, Tooltip, Upload } from "antd";
import React from "react";

import {
  channelStateToClipboard,
  clipboardToChannelState,
  isClipboardChannelState,
} from "../../shared/utils/parseClipboard";
import { useViewerState } from "../../state/store";
import { cloneChannelState } from "../../state/util";

import { useContextualAlert } from "../shared/ContextualAlert";

export type CopySettingsButtonProps = {
  imageName?: string;
  scrollContainer?: HTMLElement | null;
  hide?: boolean;
  getDropdownContainer?: () => HTMLElement;
};

type ImportResult =
  | { success: false }
  | {
      success: true;
      /** The number of channel names in the JSON that were also present in the current image. */
      matchedCount: number;
      /** A list of channel names that were present in the JSON but not in the current image. */
      unmatched: string[];
      /** Function to restore all channel states from before the new settings were imported. */
      undo: () => void;
    };

const importSettings = (settingsString: string): ImportResult => {
  const { channelSettings, replaceAllChannelSettings } = useViewerState.getState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(settingsString);
  } catch {
    parsed = undefined;
  }
  if (!isClipboardChannelState(parsed)) {
    return { success: false };
  }

  const channelStates = clipboardToChannelState(parsed);
  const channelCount = Object.keys(channelStates).length;
  const currentStates = channelSettings.map(cloneChannelState);
  const nextStates = channelSettings.map((state) => {
    const result = {
      ...cloneChannelState(state),
      ...channelStates[state.name],
    };
    delete channelStates[state.name];
    return result;
  });

  replaceAllChannelSettings(nextStates);
  const undo = (): void => replaceAllChannelSettings(currentStates);

  const unmatched = Object.keys(channelStates);
  const matchedCount = channelCount - unmatched.length;

  return { success: true, matchedCount, unmatched, undo };
};

const CopySettingsButton: React.FC<CopySettingsButtonProps> = (props) => {
  const { imageName, scrollContainer, hide, getDropdownContainer } = props;
  const [pasteDenied, setPasteDenied] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
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
    {
      key: 1,
      label: "Export",
      onClick: () => {
        const { channelSettings } = useViewerState.getState();
        const stateText = JSON.stringify(channelStateToClipboard(channelSettings));
        const link = document.createElement("a");

        link.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(stateText));
        const isoDate = new Date().toISOString().split("T")[0];
        const imgName = imageName ?? "settings";
        link.setAttribute("download", `${isoDate}_${imgName}.json`);
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    },
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

        const importResult = importSettings(clipboard);
        if (!importResult.success) {
          showMessage("Clipboard does not contain channel settings", "error");
          return;
        }

        const { unmatched, matchedCount } = importResult;
        const unmatchedCount = unmatched.length;
        const undo = (): void => {
          importResult.undo();
          showMessage(undefined);
        };

        if (unmatchedCount > 0) {
          if (matchedCount > 0) {
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
                  {unmatched.map((channelName, index) => (
                    <li key={index}>{channelName}</li>
                  ))}
                </ul>
              </>,
              "warning"
            );
          } else {
            showMessage("No channel names matched", "error");
          }
        } else {
          if (matchedCount > 0) {
            showMessage(
              <>
                Settings applied to {matchedCount} channel{matchedCount > 1 ? "s" : ""} -{" "}
                <Button type="link" style={{ padding: 0, height: "unset" }} onClick={undo}>
                  Undo
                </Button>
              </>
            );
          } else {
            showMessage("Clipboard contains an empty settings object", "error");
          }
        }
      },
    },
    { key: 3, label: "Import", onClick: () => setImportModalOpen(true) },
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
      <Modal
        closable
        title="Import channel settings"
        className="modal-settings-import"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
      >
        <p>Upload a saved .json settings file</p>
        <Upload.Dragger
          showUploadList={false}
          customRequest={async ({ file, onSuccess, onError }) => {
            const text = await (file as Blob).text();
            const importResult = importSettings(text);
            onSuccess?.(undefined);
          }}
        >
          <DragOutlined /> Drag and drop here or click to browse
        </Upload.Dragger>
      </Modal>
      {alert}
    </>
  );
};

export default CopySettingsButton;
