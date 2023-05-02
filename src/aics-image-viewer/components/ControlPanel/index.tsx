import React from "react";

import { Card, Button, Dropdown, Icon, Menu, Tooltip } from "antd";
import { ClickParam } from "antd/lib/menu";

import ChannelsWidget, { ChannelsWidgetProps } from "../ChannelsWidget";
import GlobalVolumeControls, { GlobalVolumeControlsProps } from "../GlobalVolumeControls";
import CustomizeWidget, { CustomizeWidgetProps } from "../CustomizeWidget";
import MetadataViewer from "../MetadataViewer";

import { PRESET_COLOR_MAP } from "../../shared/constants";

import "./styles.css";
import ViewerIcon from "../shared/ViewerIcon";
import { MetadataRecord } from "../../shared/types";

interface ControlPanelProps extends ChannelsWidgetProps, GlobalVolumeControlsProps, CustomizeWidgetProps {
  hasImage: boolean;
  showControls: GlobalVolumeControlsProps["showControls"] &
    CustomizeWidgetProps["showControls"] & {
      colorPresetsDropdown: boolean;
      metadataViewer: boolean;
    };
  getMetadata: () => MetadataRecord;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
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

export default function ControlPanel(props: ControlPanelProps): React.ReactElement {
  const [tab, setTab] = React.useState(ControlTab.Channels);

  const { viewerChannelSettings, showControls, hasImage } = props;

  // TODO key is a number, but ClickParam assumes keys will always be strings
  //   if future versions of antd make this type more permissive, remove ugly double-cast
  const makeTurnOnPresetFn = ({ key }: ClickParam): void =>
    props.onApplyColorPresets(PRESET_COLOR_MAP[key as unknown as number].colors);

  const renderColorPresetsDropdown = (): React.ReactNode => {
    const dropDownMenuItems = (
      <Menu onClick={makeTurnOnPresetFn}>
        {PRESET_COLOR_MAP.map((preset, index) => (
          <Menu.Item key={index}>{preset.name}</Menu.Item>
        ))}
      </Menu>
    );
    return (
      <Dropdown trigger={["click"]} overlay={dropDownMenuItems}>
        <Button>
          Apply palette
          <Icon type="down" />
        </Button>
      </Dropdown>
    );
  };

  const renderTab = (thisTab: ControlTab, icon: React.ReactNode): React.ReactNode => (
    <Tooltip title={ControlTabNames[thisTab]} placement="right" {...(!props.collapsed && { visible: false })}>
      <Button
        className={tab === thisTab ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
        onClick={() => setTab(thisTab)}
        icon={typeof icon === "string" ? icon : undefined}
      >
        {typeof icon === "object" && icon}
      </Button>
    </Tooltip>
  );

  return (
    <div className="control-panel-col-container">
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
        {props.showControls.metadataViewer && renderTab(ControlTab.Metadata, <Icon type="info" />)}
      </div>
      <div className="control-panel-col" style={{ flex: "0 0 450px" }}>
        <h2 className="control-panel-title">{ControlTabNames[tab]}</h2>
        <Card
          bordered={false}
          className="control-panel"
          title={showControls.colorPresetsDropdown && tab === ControlTab.Channels && renderColorPresetsDropdown()}
        >
          {hasImage && (
            <div className="channel-rows-list">
              {tab === ControlTab.Channels && (
                <ChannelsWidget
                  imageLoaded={props.imageLoaded}
                  channelSettings={props.channelSettings}
                  channelDataChannels={props.channelDataChannels}
                  channelGroupedByType={props.channelGroupedByType}
                  changeMultipleChannelSettings={props.changeMultipleChannelSettings}
                  saveIsosurface={props.saveIsosurface}
                  changeChannelSetting={props.changeChannelSetting}
                  onColorChangeComplete={props.onColorChangeComplete}
                  onApplyColorPresets={props.onApplyColorPresets}
                  filterFunc={props.filterFunc}
                  viewerChannelSettings={viewerChannelSettings}
                />
              )}
              {tab === ControlTab.Advanced && (
                <>
                  <GlobalVolumeControls
                    imageName={props.imageName}
                    pixelSize={props.pixelSize}
                    changeViewerSetting={props.changeViewerSetting}
                    maskAlpha={props.maskAlpha}
                    brightness={props.brightness}
                    density={props.density}
                    levels={props.levels}
                    interpolationEnabled={props.interpolationEnabled}
                    pathTraceOn={props.pathTraceOn}
                    showControls={showControls}
                  />
                  {(showControls.backgroundColorPicker || showControls.boundingBoxColorPicker) && (
                    <CustomizeWidget
                      backgroundColor={props.backgroundColor}
                      boundingBoxColor={props.boundingBoxColor}
                      changeViewerSetting={props.changeViewerSetting}
                      showBoundingBox={props.showBoundingBox}
                      showControls={props.showControls}
                    />
                  )}
                </>
              )}
              {tab === ControlTab.Metadata && <MetadataViewer metadata={props.getMetadata()} />}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
