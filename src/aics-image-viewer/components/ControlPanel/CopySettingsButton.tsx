import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps, Tooltip } from "antd";
import React from "react";

// TODO dummy function for now -- implement
const validateSettings = (_settings: string): boolean => false;

const enum PasteState {
  /** Pasting is enabled: we either know the clipboard contains paste-able settings or we can't be sure it doesn't */
  Enabled,
  /** Pasting is disabled because the clipboard doesn't contain paste-able settings */
  Invalid,
  /** Pasting is disabled because the browser is denying us access to the clipboard */
  Denied,
}

const pasteStatePrompts = {
  [PasteState.Enabled]: undefined,
  [PasteState.Invalid]: "Can't paste: clipboard does not contain channel settings.",
  [PasteState.Denied]: "Can't paste: you must grant permission to access the clipboard.",
};

const CopySettingsButton: React.FC = () => {
  const [pasteState, setPasteState] = React.useState(PasteState.Enabled);

  /** Learn as much as we can about whether the "paste" action will succeed, so we can disable it in advance. */
  const queryPasteState = React.useCallback(async (): Promise<void> => {
    try {
      // Chromium browsers: we can query permissions to learn whether a clipboard read will succeed
      const permission = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });

      // If we didn't error, the browser supports the `clipboard-read` permission. Its state may be `denied` (disable
      // paste), `granted` (silently validate clipboard), or `prompt` (wait until asked to read the clipboard).
      if (permission.state === "denied") {
        setPasteState(PasteState.Denied);
      } else if (permission.state === "granted") {
        const clipboard = await navigator.clipboard.readText();
        console.log(clipboard);
        if (!validateSettings(clipboard)) {
          setPasteState(PasteState.Invalid);
        }
      }
    } catch {
      // Non-Chromium browsers: clipboard reads don't have stateful permissions and will always require a prompt
    }
  }, []);

  /** Update our guess about whether pasting will succeed on mount and whenever the clipboard changes. */
  React.useEffect(() => {
    queryPasteState();
    // This event only exists in Chromium-based browsers, but `queryPasteState` only works in Chromium-based browsers
    navigator.clipboard.addEventListener("clipboardchange", queryPasteState);
    return () => navigator.clipboard.removeEventListener("clipboardchange", queryPasteState);
  }, [queryPasteState]);

  const pastePrompt = pasteStatePrompts[pasteState] && (
    <Tooltip title={pasteStatePrompts[pasteState]} placement="right">
      <ExclamationCircleOutlined />
    </Tooltip>
  );

  const items: MenuProps["items"] = [
    {
      key: 0,
      label: "Copy",
      onClick: async () => {
        console.log(await navigator.clipboard.readText());
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
      disabled: pasteState !== PasteState.Enabled,
      onClick: async () => {
        console.log(await navigator.clipboard.readText());
        queryPasteState();
      },
    },
    { key: 3, label: "Import" },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]} overlayStyle={{ minWidth: 100 }}>
      <Button type="text" size="large">
        <EllipsisOutlined />
      </Button>
    </Dropdown>
  );
};

export default CopySettingsButton;
