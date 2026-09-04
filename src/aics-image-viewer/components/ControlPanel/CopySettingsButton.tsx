import { DragOutlined, EllipsisOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Dropdown, Modal, Tooltip, Upload } from "antd";
import type { AlertProps, DraggerProps, MenuProps } from "antd";
import type { MenuItemType } from "antd/es/menu/interface";
import React from "react";

import {
  channelStatesToSnapshot,
  isStoreSnapshot,
  singleChannelStateToSnapshot,
  snapshotToChannelStates,
  type StoreSnapshot,
} from "../../shared/utils/parseSnapshot";
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

const parseSnapshot = (snapshotString: string): Record<string, Partial<ChannelState>> | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshotString);
  } catch {
    parsed = undefined;
  }
  if (!isStoreSnapshot(parsed)) {
    return undefined;
  }
  return snapshotToChannelStates(parsed);
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

const SuccessMessage: React.FC<{ channelCount?: number; undo: () => void }> = ({ channelCount, undo }) => (
  <>
    Settings applied{channelCount !== undefined && `to ${channelCount} channel${channelCount > 1 ? "s" : ""}`} -{" "}
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

  const applySnapshotText = React.useCallback(
    (textSnapshot: string, sourceName: string, defaultModalAlerts: boolean): boolean => {
      const showDefaultAlert = defaultModalAlerts ? showModalAlert : showContextualAlert;
      const sourceNameCapitalized = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);

      const parsedStates = parseSnapshot(textSnapshot);
      const { channelSettings, replaceAllChannelSettings } = useViewerState.getState();
      const currentStates = channelSettings.map(cloneChannelState);

      if (parsedStates === undefined) {
        showDefaultAlert(`${sourceNameCapitalized} does not contain channel settings`, "error");
        return false;
      }
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

      const unmatchedCount = unmatched.length;
      replaceAllChannelSettings(states);
      undoRef.current = () => replaceAllChannelSettings(currentStates);

      if (unmatchedCount > 0) {
        if (matchedCount > 0) {
          // Some channels in the text snapshot matched, some did not
          setImportModalState(ImportModalState.Warning);
          showModalAlert(<PartialMatchMessage matchedCount={matchedCount} unmatched={unmatched} />, "warning");
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

  const applySingleChannelSnapshotText = React.useCallback(
    (textSnapshot: string, sourceName: string, defaultModalAlerts: boolean, channelIndex: number): boolean => {
      const showDefaultAlert = defaultModalAlerts ? showModalAlert : showContextualAlert;
      const sourceNameCapitalized = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);

      const parsedStates = parseSnapshot(textSnapshot);
      if (parsedStates === undefined) {
        showDefaultAlert(`${sourceNameCapitalized} does not contain a channel setting`);
        return false;
      }

      const states = Object.values(parsedStates);
      if (states.length < 1) {
        showDefaultAlert(`${sourceNameCapitalized} does not contain a channel setting`);
        return false;
      } else if (states.length > 1) {
        showDefaultAlert(
          `${sourceNameCapitalized} contains multiple channel settings and can't be applied to a single channel`
        );
        return false;
      }

      const [state] = states;
      const { channelSettings, replaceAllChannelSettings } = useViewerState.getState();
      const currentStates = channelSettings.map(cloneChannelState);
      const newStates = channelSettings.map((currentState, index) => {
        if (index === channelIndex) {
          return { ...cloneChannelState(currentState), ...state };
        } else {
          return cloneChannelState(currentState);
        }
      });

      replaceAllChannelSettings(newStates);
      undoRef.current = () => replaceAllChannelSettings(currentStates);

      showContextualAlert(<SuccessMessage undo={undo} />);
      return true;
    },
    [showContextualAlert, showModalAlert, undo]
  );

  const onClickExport = React.useCallback(() => {
    setDropdownOpen(false);
    const { channelSettings } = useViewerState.getState();
    let serialized: StoreSnapshot;
    if (props.channelIndex !== undefined) {
      const channel = channelSettings[props.channelIndex];
      serialized = singleChannelStateToSnapshot(channel, includeColor ? undefined : ["color"]);
    } else {
      serialized = channelStatesToSnapshot(channelSettings, includeColor ? undefined : ["color"]);
    }
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
  }, [imageName, includeColor, props.channelIndex]);

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

    if (props.channelIndex !== undefined) {
      applySingleChannelSnapshotText(clipboard, "clipboard", false, props.channelIndex);
    } else {
      applySnapshotText(clipboard, "clipboard", false);
    }
  }, [applySingleChannelSnapshotText, applySnapshotText, props.channelIndex, showContextualAlert]);

  const onImportFile = React.useCallback<DraggerProps["customRequest"] & {}>(
    async ({ file, onSuccess, onError }) => {
      const text = await (file as Blob).text();
      let result: boolean;
      if (props.channelIndex !== undefined) {
        result = applySingleChannelSnapshotText(text, "file", true, props.channelIndex);
      } else {
        result = applySnapshotText(text, "file", true);
      }

      if (result) {
        onSuccess?.(undefined);
      } else {
        onError?.(new Error());
      }
    },
    [applySingleChannelSnapshotText, applySnapshotText, props.channelIndex]
  );

  const copyItem: MenuItemType = {
    key: "Copy",
    label: "Copy",
    onClick: () => {
      setDropdownOpen(false);
      try {
        const { channelSettings } = useViewerState.getState();
        let serialized: StoreSnapshot;
        if (props.channelIndex !== undefined) {
          const channel = channelSettings[props.channelIndex];
          serialized = singleChannelStateToSnapshot(channel, includeColor ? undefined : ["color"]);
        } else {
          serialized = channelStatesToSnapshot(channelSettings, includeColor ? undefined : ["color"]);
        }
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
