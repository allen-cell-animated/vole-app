import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps, Tooltip } from "antd";
import React from "react";

import { deserializeChannelState, parseKeyValueList } from "../../state/deserialize";
import { objectToKeyValueList, serializeViewerChannelSetting } from "../../state/serialize";
import { useViewerState } from "../../state/store";
import type { ChannelState } from "../../state/types";

type SerializedChannelState = {
  version: string;
  channels: Record<string, string>;
};

const validateState = (settings: unknown): settings is SerializedChannelState => {
  return (
    settings !== null &&
    settings !== undefined &&
    typeof (settings as SerializedChannelState).version === "string" &&
    typeof (settings as SerializedChannelState).channels === "object"
  );
};

const serializeChannelState = (channelStates: ChannelState[]): SerializedChannelState => {
  const channels: Record<string, string> = {};
  for (const ch of channelStates) {
    const stateString = objectToKeyValueList(serializeViewerChannelSetting(ch, false));
    channels[ch.name] = stateString;
  }

  return { version: VOLEAPP_VERSION, channels };
};

const deserialize = (serialized: SerializedChannelState): Record<string, Partial<ChannelState>> => {
  const result: Record<string, Partial<ChannelState>> = {};
  for (const [name, state] of Object.entries(serialized.channels)) {
    result[name] = deserializeChannelState(parseKeyValueList(state));
  }
  return result;
};

const enum ClipboardState {
  /** Pasting is enabled: we either know the clipboard contains paste-able settings or we can't be sure it doesn't */
  Enabled,
  /** Pasting is disabled because the clipboard doesn't contain paste-able settings */
  Invalid,
  /** Copying and pasting are both disabled because the browser is denying us access to the clipboard */
  Denied,
}

const clipboardStatePrompts = {
  [ClipboardState.Enabled]: undefined,
  [ClipboardState.Invalid]: "Can't paste: clipboard does not contain channel settings.",
  [ClipboardState.Denied]: "Can't paste: you must grant permission to access the clipboard.",
};

const CopySettingsButton: React.FC = () => {
  const [clipboardState, setClipboardState] = React.useState(ClipboardState.Enabled);

  /** Learn as much as we can about whether the "paste" action will succeed, so we can disable it in advance. */
  const queryPasteState = React.useCallback(async (): Promise<void> => {
    let permission: PermissionStatus;
    try {
      // Chromium browsers: we can query permissions to learn whether a clipboard read will succeed
      permission = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
    } catch {
      // Non-Chromium browsers: clipboard reads don't have stateful permissions and will always require a prompt
      setClipboardState(ClipboardState.Enabled);
      return;
    }

    // If we're here, the `clipboard-read` permission is supported. Its value may be `denied`, `granted`, or `prompt`.
    if (permission.state === "denied") {
      setClipboardState(ClipboardState.Denied);
    } else if (permission.state === "granted") {
      try {
        const clipboardText = await navigator.clipboard.readText();
        const clipboardJson = JSON.parse(clipboardText);
        if (validateState(clipboardJson)) {
          setClipboardState(ClipboardState.Enabled);
        } else {
          setClipboardState(ClipboardState.Invalid);
        }
      } catch {
        // Clipboard does not contain JSON
        setClipboardState(ClipboardState.Invalid);
      }
    }
  }, []);

  // Update our guess about whether pasting will succeed on mount and whenever the clipboard changes.
  React.useEffect(() => {
    queryPasteState();
    // This event only exists in Chromium browsers, but `queryPasteState` only works in Chromium browsers anyways
    navigator.clipboard.addEventListener("clipboardchange", queryPasteState);
    return () => navigator.clipboard.removeEventListener("clipboardchange", queryPasteState);
  }, [queryPasteState]);

  const pastePrompt = clipboardStatePrompts[clipboardState] && (
    <Tooltip title={clipboardStatePrompts[clipboardState]} placement="right">
      <ExclamationCircleOutlined />
    </Tooltip>
  );

  const items: MenuProps["items"] = [
    {
      key: 0,
      label: "Copy",
      onClick: async () => {
        const { channelSettings } = useViewerState.getState();
        navigator.clipboard.writeText(JSON.stringify(serializeChannelState(channelSettings)));
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
      disabled: clipboardState !== ClipboardState.Enabled,
      onClick: async () => {
        const { channelSettings, replaceAllChannelSettings } = useViewerState.getState();
        try {
          const clipboard = await navigator.clipboard.readText();
          const parsed = JSON.parse(clipboard);
          if (!validateState(parsed)) {
            return;
          }
          const deserialized = deserialize(parsed);

          const nextState = channelSettings.map((state) => ({
            ...state,
            ...deserialized[state.name],
          }));
          replaceAllChannelSettings(nextState);
        } catch {
          // If paste failed, check if it was because the user was asked to grant clipboard access and said no
          queryPasteState();
        }
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
