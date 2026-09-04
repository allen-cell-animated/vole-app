import { DragOutlined, EllipsisOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Dropdown, Modal, Tooltip, Upload } from "antd";
import type { AlertProps, DraggerProps, MenuProps } from "antd";
import type { MenuItemType } from "antd/es/menu/interface";
import React from "react";

import { channelStatesToSnapshot, isStoreSnapshot, snapshotToChannelStates } from "../../shared/utils/parseSnapshot";
import { queryPasteDenied } from "../../shared/utils/permissions";
import { useViewerState } from "../../state/store";
import type { ChannelState } from "../../state/types";
import { cloneChannelState } from "../../state/util";

import { useContextualAlert } from "../shared/ContextualAlert";

export type CopySettingsButtonProps = {
  imageName?: string;
  scrollContainer?: HTMLElement | null;
  hide?: boolean;
  getDropdownContainer?: () => HTMLElement;
  hideImportExport?: boolean;
  channelIndex?: number;
};

const enum ImportModalState {
  Closed,
  Import,
  Warning,
}

type ApplySnapshotResult =
  | { success: false }
  | {
      success: true;
      /** The set of channel states after application of the imported settings string. */
      states: ChannelState[];
      /** The number of channel names in the JSON that were also present in the current image. */
      matchedCount: number;
      /** A list of channel names that were present in the JSON but not in the current image. */
      unmatched: string[];
    };

const applySnapshot = (currentStates: ChannelState[], snapshotString: string): ApplySnapshotResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshotString);
  } catch {
    parsed = undefined;
  }
  if (!isStoreSnapshot(parsed)) {
    return { success: false };
  }

  const parsedStates = snapshotToChannelStates(parsed);
  const channelCount = Object.keys(parsedStates).length;
  const states = currentStates.map((state) => {
    const result = {
      ...cloneChannelState(state),
      ...parsedStates[state.name],
    };
    delete parsedStates[state.name];
    return result;
  });

  const unmatched = Object.keys(parsedStates);
  const matchedCount = channelCount - unmatched.length;

  return { success: true, matchedCount, unmatched, states };
};

const PartialMatchMessage: React.FC<{ matchedCount: number; unmatched: string[] }> = (props) => {
  const { matchedCount, unmatched } = props;
  const unmatchedCount = unmatched.length;
  return (
    <>
      <div>
        Settings applied to {matchedCount} channel{matchedCount > 1 ? "s" : ""}. Could not find a match for{" "}
        {unmatchedCount} channel name{unmatchedCount > 1 ? "s" : ""}:
      </div>
      <ul>
        {unmatched.map((channelName, index) => (
          <li key={index}>{channelName}</li>
        ))}
      </ul>
    </>
  );
};

const SuccessMessage: React.FC<{ channelCount: number; undo: () => void }> = ({ channelCount, undo }) => (
  <>
    Settings applied to {channelCount} channel{channelCount > 1 ? "s" : ""} -{" "}
    <Button type="link" style={{ padding: 0, height: "unset" }} onClick={undo}>
      Undo
    </Button>
  </>
);

const CopySettingsButton: React.FC<CopySettingsButtonProps> = (props) => {
  const { imageName, scrollContainer, hide, getDropdownContainer } = props;
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const [includeColor, setIncludeColor] = React.useState(true);
  const [pasteDenied, setPasteDenied] = React.useState(false);

  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [importModalState, setImportModalState] = React.useState(ImportModalState.Closed);

  const [alert, showContextualAlert] = useContextualAlert(buttonRef.current, { scrollContainer, hide, timeout: 8_000 });
  const [modalAlert, setModalAlert] = React.useState<React.ReactNode>(undefined);
  const [modalAlertType, setModalAlertType] = React.useState<AlertProps["type"]>(undefined);

  const showModalAlert = React.useCallback((content: React.ReactNode, alertType?: AlertProps["type"]) => {
    setModalAlert(content);
    setModalAlertType(alertType);
  }, []);

  const undoRef = React.useRef<() => void>();

  const undo = React.useCallback(() => {
    undoRef.current?.();
    showModalAlert(undefined);
    showContextualAlert(undefined);
  }, [showContextualAlert, showModalAlert]);

  // On first render, check if the user has disabled clipboard access
  const firstRenderRef = React.useRef(false);
  if (firstRenderRef.current) {
    queryPasteDenied().then(setPasteDenied);
    firstRenderRef.current = true;
  }

  const pastePrompt = pasteDenied && (
    <Tooltip title="You must grant access to the clipboard" placement="right">
      <ExclamationCircleOutlined />
    </Tooltip>
  );

  const onReceiveSnapshotText = React.useCallback(
    (textSnapshot: string, sourceName: string, defaultModalAlerts: boolean): boolean => {
      const showDefaultAlert = defaultModalAlerts ? showModalAlert : showContextualAlert;
      const sourceNameCapitalized = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);

      const { channelSettings, replaceAllChannelSettings } = useViewerState.getState();
      const currentStates = channelSettings.map(cloneChannelState);
      const importResult = applySnapshot(channelSettings, textSnapshot);
      console.log(importResult);

      if (!importResult.success) {
        showDefaultAlert(`${sourceNameCapitalized} does not contain channel settings`, "error");
        return false;
      }

      const { matchedCount, unmatched, states } = importResult;
      const unmatchedCount = unmatched.length;
      replaceAllChannelSettings(states);
      undoRef.current = (): void => replaceAllChannelSettings(currentStates);

      if (unmatchedCount > 0) {
        if (matchedCount > 0) {
          // Some channels in the text snapshot matched, some did not
          setImportModalState(ImportModalState.Warning);
          showModalAlert(<PartialMatchMessage {...importResult} />, "warning");
        } else {
          // No channels in the text snapshot matched channels in the current image
          showDefaultAlert(`Channel names in ${sourceName} did not match names in image`, "error");
        }
      } else {
        if (matchedCount > 0) {
          // All channels matched!
          setImportModalState(ImportModalState.Closed);
          showContextualAlert(<SuccessMessage channelCount={matchedCount} undo={undo} />);
        } else {
          // There were no channels in the text snapshot at all!
          showDefaultAlert(`${sourceNameCapitalized} does not contain channel settings`, "error");
        }
      }

      return true;
    },
    [showContextualAlert, showModalAlert, undo]
  );

  const onClickExport = React.useCallback(() => {
    setDropdownOpen(false);
    const { channelSettings } = useViewerState.getState();
    const serialized = channelStatesToSnapshot(channelSettings, includeColor ? undefined : ["color"]);
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
  }, [imageName, includeColor]);

  const onClickPaste = React.useCallback(async () => {
    setDropdownOpen(false);

    // Try to read the clipboard
    let clipboard: string | undefined = undefined;
    try {
      clipboard = await navigator.clipboard.readText();
    } catch {
      showContextualAlert("Could not read clipboard", "error");
      // If paste failed, check if it was because the user was asked to grant clipboard access and said no
      queryPasteDenied().then(setPasteDenied);
      return;
    }

    onReceiveSnapshotText(clipboard, "clipboard", false);
  }, [onReceiveSnapshotText, showContextualAlert]);

  const onImportFile = React.useCallback<DraggerProps["customRequest"] & {}>(
    async ({ file, onSuccess, onError }) => {
      const text = await (file as Blob).text();
      const result = onReceiveSnapshotText(text, "file", true);

      if (result) {
        onSuccess?.(undefined);
      } else {
        onError?.(new Error());
      }
    },
    [onReceiveSnapshotText]
  );

  const copyItem: MenuItemType = {
    key: "Copy",
    label: "Copy",
    onClick: () => {
      setDropdownOpen(false);
      try {
        const { channelSettings } = useViewerState.getState();
        const serialized = channelStatesToSnapshot(channelSettings, includeColor ? undefined : ["color"]);
        navigator.clipboard.writeText(JSON.stringify(serialized));
        showContextualAlert("Settings copied");
      } catch {
        showContextualAlert("Could not copy settings", "error");
      }
    },
  };
  const pasteItem: MenuItemType = {
    key: "Paste",
    label: (
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Paste</span>
        {pastePrompt}
      </div>
    ),
    disabled: pasteDenied,
    onClick: onClickPaste,
  };

  const includeColorItem: MenuItemType = {
    key: "IncludeColor",
    className: "import-dropdown-menu-item-include-color",
    label: <Checkbox checked={includeColor}>Include color setting</Checkbox>,
    onClick: ({ domEvent }) => {
      domEvent.stopPropagation();
      domEvent.preventDefault();
      setIncludeColor((includeColor) => !includeColor);
    },
  };

  let items: MenuProps["items"];
  if (props.hideImportExport) {
    items = [copyItem, pasteItem, { key: "divider", type: "divider" }, includeColorItem];
  } else {
    const exportItem = {
      key: 1,
      label: "Export",
      onClick: onClickExport,
    };
    const importItem = {
      key: 3,
      label: "Import",
      onClick: () => {
        setDropdownOpen(false);
        setImportModalState(ImportModalState.Import);
        showModalAlert(undefined);
      },
    };
    items = [copyItem, exportItem, pasteItem, importItem, { key: "divider", type: "divider" }, includeColorItem];
  }

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
        title={
          importModalState === ImportModalState.Warning ? "Settings applied with exceptions" : "Import channel settings"
        }
        className="modal-settings-import"
        open={importModalState !== ImportModalState.Closed}
        onCancel={() => setImportModalState(ImportModalState.Closed)}
        footer={
          importModalState === ImportModalState.Warning && (
            <>
              <Button
                onClick={() => {
                  undo();
                  setImportModalState(ImportModalState.Closed);
                }}
              >
                Undo all
              </Button>
              <Button type="primary" onClick={() => setImportModalState(ImportModalState.Closed)}>
                Ok
              </Button>
            </>
          )
        }
        getContainer={getDropdownContainer}
      >
        {importModalState === ImportModalState.Import && (
          <>
            <p>Upload a saved .json settings file</p>
            <Upload.Dragger showUploadList={false} customRequest={onImportFile} accept=".json">
              <DragOutlined /> Drag and drop here or click to browse
            </Upload.Dragger>
          </>
        )}
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
