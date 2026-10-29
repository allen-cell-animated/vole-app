import { Collapse, type CollapseProps, Flex } from "antd";
import React, { type ReactElement } from "react";

import CustomizeWidget, { type CustomizeWidgetProps } from "../CustomizeWidget";
import GlobalVolumeControls, { type GlobalVolumeControlsProps } from "../GlobalVolumeControls";
import ResetButton from "./ResetButton";

type AdvancedSettingsProps = {
  visibleControls: GlobalVolumeControlsProps["visibleControls"] & CustomizeWidgetProps["visibleControls"];
  resetToDefaultViewerState: () => void;
  resetToInitialViewerState: () => void;
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
      <Flex style={{ margin: "0 10px", width: "fit-content" }} vertical gap={10}>
        <ResetButton
          label={"Reset all viewer and channel settings"}
          tooltip={"Resets all settings to the viewer's defaults"}
          popupTitle={"Clear all settings?"}
          popupDescription={
            "All viewer settings, including the channel settings, color presets, and rendering settings, will be reset to the viewer's defaults. This cannot be undone."
          }
          onConfirm={props.resetToDefaultViewerState}
        ></ResetButton>
        <ResetButton
          label={"Reset to initial view"}
          tooltip={"Resets all settings to the initial view"}
          popupTitle={"Reset all settings?"}
          popupDescription={
            "All viewer settings, including the channel settings, color presets, and rendering settings, will be reset to the initial view. This cannot be undone."
          }
          onConfirm={props.resetToInitialViewerState}
        ></ResetButton>
      </Flex>
    </Flex>
  );
}
