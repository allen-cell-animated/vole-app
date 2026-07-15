import { DragOutlined, EllipsisOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, type AlertProps, Button, Checkbox, Dropdown, type MenuProps, Modal, Tooltip, Upload } from "antd";
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

const PartialMatchMessage: React.FC<{ matchedCount: number; unmatched: string[]; undo: () => void }> = (props) => {
  const { matchedCount, unmatched, undo } = props;
  const unmatchedCount = unmatched.length;
  return (
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
    </>
  );
};

const CopySettingsButton: React.FC<CopySettingsButtonProps> = (props) => {
  const { imageName, scrollContainer, hide, getDropdownContainer } = props;
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const [includeColor, setIncludeColor] = React.useState(true);
  const [pasteDenied, setPasteDenied] = React.useState(false);

  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);

  const [alert, showContextualAlert] = useContextualAlert(buttonRef.current, { scrollContainer, hide, timeout: 8_000 });
  const [modalAlert, setModalAlert] = React.useState<React.ReactNode>(undefined);
  const [modalAlertType, setModalAlertType] = React.useState<AlertProps["type"]>(undefined);

  const showModalAlert = React.useCallback((content: React.ReactNode, alertType?: AlertProps["type"]) => {
    setModalAlert(content);
    setModalAlertType(alertType);
  }, []);

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
      onClick: () => {
        setDropdownOpen(false);
        try {
          const { channelSettings } = useViewerState.getState();
          const serialized = channelStateToClipboard(channelSettings, includeColor ? undefined : ["color"]);
          navigator.clipboard.writeText(JSON.stringify(serialized));
          showContextualAlert("Settings copied");
        } catch {
          showContextualAlert("Could not copy settings", "error");
        }
      },
    },
    {
      key: 1,
      label: "Export",
      onClick: () => {
        setDropdownOpen(false);
        const { channelSettings } = useViewerState.getState();
        const serialized = channelStateToClipboard(channelSettings, includeColor ? undefined : ["color"]);
        const stateText = JSON.stringify(serialized);
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
        setDropdownOpen(false);

        // Try to read the clipboard
        let clipboard: string | undefined = undefined;
        try {
          clipboard = await navigator.clipboard.readText();
        } catch {
          showContextualAlert("Could not read clipboard", "error");
          // If paste failed, check if it was because the user was asked to grant clipboard access and said no
          queryPasteState();
          return;
        }

        const importResult = importSettings(clipboard);
        if (!importResult.success) {
          showContextualAlert("Clipboard does not contain channel settings", "error");
          return;
        }

        const { unmatched, matchedCount } = importResult;
        const unmatchedCount = unmatched.length;
        const undo = (): void => {
          importResult.undo();
          showContextualAlert(undefined);
        };

        if (unmatchedCount > 0) {
          if (matchedCount > 0) {
            showContextualAlert(<PartialMatchMessage {...importResult} undo={undo} />, "warning");
          } else {
            showContextualAlert("Channel names in clipboard did not match names in image", "error");
          }
        } else {
          if (matchedCount > 0) {
            showContextualAlert(
              <>
                Settings applied to {matchedCount} channel{matchedCount > 1 ? "s" : ""} -{" "}
                <Button type="link" style={{ padding: 0, height: "unset" }} onClick={undo}>
                  Undo
                </Button>
              </>
            );
          } else {
            showContextualAlert("Clipboard does not contain channel settings", "error");
          }
        }
      },
    },
    {
      key: 3,
      label: "Import",
      onClick: () => {
        setDropdownOpen(false);
        setImportModalOpen(true);
        showModalAlert(undefined);
      },
    },
    { key: 4, type: "divider" },
    {
      key: 5,
      className: "import-dropdown-menu-item-include-color",
      label: <Checkbox checked={includeColor}>Include color setting</Checkbox>,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        domEvent.preventDefault();
        setIncludeColor((includeColor) => !includeColor);
      },
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items }}
        trigger={["click"]}
        overlayStyle={{ minWidth: 100 }}
        getPopupContainer={getDropdownContainer}
        open={dropdownOpen}
        onOpenChange={(open, { source }) => {
          if (open || source === "trigger") {
            setDropdownOpen(open);
          }
        }}
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
        getContainer={getDropdownContainer}
      >
        <p>Upload a saved .json settings file</p>
        <Upload.Dragger
          showUploadList={false}
          customRequest={async ({ file, onSuccess, onError }) => {
            const text = await (file as Blob).text();
            const importResult = importSettings(text);

            if (!importResult.success) {
              showModalAlert("File does not contain channel settings", "error");
              onError?.(new Error());
              return;
            }

            const { matchedCount, unmatched } = importResult;
            const unmatchedCount = unmatched.length;
            const undo = (): void => {
              importResult.undo();
              showContextualAlert(undefined);
              showModalAlert(undefined);
            };

            if (unmatchedCount > 0) {
              if (matchedCount > 0) {
                setImportModalOpen(false);
                showContextualAlert(<PartialMatchMessage {...importResult} undo={undo} />, "warning");
              } else {
                showModalAlert("Channel names in file did not match names in image", "error");
              }
            } else {
              if (matchedCount > 0) {
                setImportModalOpen(false);
                showContextualAlert(
                  <>
                    Settings applied to {matchedCount} channel{matchedCount > 1 ? "s" : ""} -{" "}
                    <Button type="link" style={{ padding: 0, height: "unset" }} onClick={undo}>
                      Undo
                    </Button>
                  </>
                );
              } else {
                showModalAlert("File does not contain channel settings", "error");
              }
            }
            onSuccess?.(undefined);
          }}
        >
          <DragOutlined /> Drag and drop here or click to browse
        </Upload.Dragger>
        {modalAlert !== undefined && (
          <Alert
            showIcon
            style={{ marginTop: 15 }}
            message={modalAlert}
            icon={
              modalAlertType === "error" ? (
                <WarningOutlined style={{ fontSize: 21 }} />
              ) : (
                <ExclamationCircleOutlined style={{ fontSize: 21 }} />
              )
            }
            type={modalAlertType}
          />
        )}
      </Modal>
      {alert}
    </>
  );
};

export default CopySettingsButton;
