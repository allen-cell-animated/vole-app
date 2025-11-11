import { Button, Collapse, type CollapseProps, Dropdown, Flex, type MenuProps, Tooltip } from "antd";
import type { MenuInfo } from "rc-menu/lib/interface";
import React from "react";

import { PRESET_COLOR_MAP } from "../../shared/constants";
import type { MetadataRecord } from "../../shared/types";

import ChannelsWidget from "../ChannelsWidget";
import CustomizeWidget, { type CustomizeWidgetProps } from "../CustomizeWidget";
import GlobalVolumeControls, { type GlobalVolumeControlsProps } from "../GlobalVolumeControls";
import MetadataViewer from "../MetadataViewer";
import ViewerIcon from "../shared/ViewerIcon";
import { connectToViewerState } from "../ViewerStateProvider";

import "./styles.css";

type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

interface ControlPanelProps
  extends PropsOf<typeof ChannelsWidget>,
    PropsOf<typeof GlobalVolumeControls>,
    PropsOf<typeof CustomizeWidget> {
  hasImage: boolean;
  visibleControls: GlobalVolumeControlsProps["visibleControls"] &
    CustomizeWidgetProps["visibleControls"] & {
      colorPresetsDropdown: boolean;
      metadataViewer: boolean;
    };
  getMetadata: () => MetadataRecord;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  resetToDefaultViewerState: () => void;
}

const enum ControlTab {
  Channels,
  Advanced,
  Metadata,
}

const ControlTabNames = {
  [ControlTab.Channels]: "Channel Settings",
  [ControlTab.Advanced]: "Advanced Settings",
  [ControlTab.Metadata]: "Metadata",
};

function ControlPanel(props: ControlPanelProps): React.ReactElement {
  const [tab, _setTab] = React.useState(ControlTab.Channels);
  const setTab = (newTab: ControlTab): void => {
    _setTab(newTab);
    props.setCollapsed(false);
  };

  const controlPanelContainerRef = React.useRef<HTMLDivElement>(null);
  const getDropdownContainer = controlPanelContainerRef.current ? () => controlPanelContainerRef.current! : undefined;

  const { viewerChannelSettings, visibleControls, hasImage } = props;

  // TODO key is a number, but MenuInfo assumes keys will always be strings
  //   if future versions of antd make this type more permissive, remove ugly double-cast
  const makeTurnOnPresetFn = ({ key }: MenuInfo): void =>
    props.onApplyColorPresets(PRESET_COLOR_MAP[key as unknown as number].colors);

  const renderColorPresetsDropdown = (): React.ReactNode => {
    const dropDownMenuProps: MenuProps = {
      items: PRESET_COLOR_MAP.map((preset, index) => {
        return { key: index, label: preset.name };
      }),
      onClick: makeTurnOnPresetFn,
    };
    return (
      <div className="color-presets-dropdown">
        <Dropdown trigger={["click"]} menu={dropDownMenuProps} getPopupContainer={getDropdownContainer}>
          <Button>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px" }}>
              Apply palette
              <ViewerIcon type="dropdownArrow" style={{ fontSize: "14px" }} />
            </div>
          </Button>
        </Dropdown>
      </div>
    );
  };

  const renderTab = (thisTab: ControlTab, icon: React.ReactNode): React.ReactNode => (
    <Tooltip title={ControlTabNames[thisTab]} placement="right" {...(!props.collapsed && { open: false })}>
      <Button
        className={tab === thisTab ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
        onClick={() => setTab(thisTab)}
        icon={typeof icon === "string" ? icon : undefined}
      >
        {typeof icon === "object" && icon}
      </Button>
    </Tooltip>
  );

  const renderAdvancedSettings = (): React.ReactNode => {
    const items: CollapseProps["items"] = [
      {
        key: 0,
        label: "Rendering adjustments",
        children: (
          <GlobalVolumeControls
            imageName={props.imageName}
            pixelSize={props.pixelSize}
            visibleControls={visibleControls}
          />
        ),
      },
    ];
    const showCustomize = visibleControls.backgroundColorPicker || visibleControls.boundingBoxColorPicker;

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
  };

  return (
    <div className="control-panel-col-container" ref={controlPanelContainerRef}>
      <div className="control-panel-tab-col" style={{ flex: "0 0 50px" }}>
        <Button
          className={"ant-btn-icon-only btn-collapse" + (props.collapsed ? " btn-collapse-collapsed" : "")}
          onClick={() => props.setCollapsed(!props.collapsed)}
        >
          <ViewerIcon type="closePanel" />
        </Button>

        <div className="tab-divider" />

        {renderTab(ControlTab.Channels, <ViewerIcon type="channels" />)}
        {renderTab(ControlTab.Advanced, <ViewerIcon type="preferences" />)}
        {props.visibleControls.metadataViewer && renderTab(ControlTab.Metadata, <ViewerIcon type="metadata" />)}
      </div>
      <div className="control-panel-col" style={{ flex: "0 0 450px" }}>
        <h2 className="control-panel-title">{ControlTabNames[tab]}</h2>
        {visibleControls.colorPresetsDropdown && tab === ControlTab.Channels && renderColorPresetsDropdown()}
        {hasImage && (
          <div className="channel-rows-list">
            {tab === ControlTab.Channels && (
              <ChannelsWidget
                channelDataChannels={props.channelDataChannels}
                channelGroupedByType={props.channelGroupedByType}
                saveIsosurface={props.saveIsosurface}
                onColorChangeComplete={props.onColorChangeComplete}
                onApplyColorPresets={props.onApplyColorPresets}
                filterFunc={props.filterFunc}
                viewerChannelSettings={viewerChannelSettings}
              />
            )}
            {tab === ControlTab.Advanced && renderAdvancedSettings()}
            {tab === ControlTab.Metadata && <MetadataViewer metadata={props.getMetadata()} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default connectToViewerState(ControlPanel, ["resetToDefaultViewerState"]);
