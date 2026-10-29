import { Button, Collapse, type CollapseProps, Flex, Tooltip } from "antd";
import React, { type ReactElement } from "react";

import CustomizeWidget, { type CustomizeWidgetProps } from "../CustomizeWidget";
import GlobalVolumeControls, { type GlobalVolumeControlsProps } from "../GlobalVolumeControls";

type AdvancedSettingsProps = {
  visibleControls: GlobalVolumeControlsProps["visibleControls"] & CustomizeWidgetProps["visibleControls"];
  resetToDefaultViewerState: () => void;
};

export default function AdvancedSettings(props: AdvancedSettingsProps): ReactElement {
  const items: CollapseProps["items"] = [
    {
      key: 0,
      label: "Rendering adjustments",
      children: <GlobalVolumeControls visibleControls={props.visibleControls} />,
    },
  ];
  const showCustomize = props.visibleControls.backgroundColorPicker || props.visibleControls.boundingBoxColorPicker;

  if (showCustomize) {
    items.push({
      key: 1,
      label: "Customize",
      children: <CustomizeWidget visibleControls={props.visibleControls} />,
    });
  }

  return (
    <Flex gap={10} vertical>
      <Collapse bordered={false} defaultActiveKey={showCustomize ? [0, 1] : 0} items={items} />
      <div style={{ margin: "0 10px", width: "fit-content" }}>
        <Tooltip
          trigger={["hover", "focus"]}
          placement="right"
          title="Clears ALL rendering settings and channel configuration to the default viewer state.
            This will replace any edits to channel settings, color presets, and rendering adjustments."
        >
          <Button onClick={props.resetToDefaultViewerState}>Clear all settings</Button>
        </Tooltip>
      </div>
    </Flex>
  );
}
