import { Button, Checkbox, Dropdown, type MenuProps, Tooltip } from "antd";
import React from "react";

import { PRESET_COLOR_MAP } from "../../shared/constants";
import type { MetadataRecord } from "../../shared/types";
import { select, useViewerState } from "../../state/store";

import ChannelsWidget, { type ChannelsWidgetProps } from "../ChannelsWidget";
import type { CustomizeWidgetProps } from "../CustomizeWidget";
import type { GlobalVolumeControlsProps } from "../GlobalVolumeControls";
import MetadataViewer from "../MetadataViewer";
import ViewerIcon from "../shared/ViewerIcon";
import AdvancedSettings from "./AdvancedSettings";
import CopySettingsButton from "./CopySettingsButton";

import "./styles.css";

interface ControlPanelProps extends ChannelsWidgetProps, GlobalVolumeControlsProps, CustomizeWidgetProps {
  hasImage: boolean;
  imageName: string | undefined;
  visibleControls: GlobalVolumeControlsProps["visibleControls"] &
    CustomizeWidgetProps["visibleControls"] & {
      colorPresetsDropdown: boolean;
      metadataViewer: boolean;
    };
  metadata: MetadataRecord;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const enum ControlTab {
  Channels,
  Advanced,
  Metadata,
}

const ControlTabNames = {
  [ControlTab.Channels]: "Channel settings",
  [ControlTab.Advanced]: "Advanced settings",
  [ControlTab.Metadata]: "Metadata",
};

function ControlPanel(props: ControlPanelProps): React.ReactElement {
  const [tab, _setTab] = React.useState(ControlTab.Channels);
  const setTab = (newTab: ControlTab): void => {
    _setTab(newTab);
    props.setCollapsed(false);
  };
  const resetToDefaultViewerState = useViewerState(select("resetToDefaultViewerState"));
  const singleChannelMode = useViewerState(select("singleChannelMode"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  const containerRef = React.useRef<HTMLDivElement>(null);
  const columnRef = React.useRef<HTMLDivElement>(null);
  const getDropdownContainer = (): HTMLElement => containerRef.current ?? document.body;

  const { viewerChannelSettings, visibleControls, hasImage } = props;

  const renderChannelSettingsHeader = (): React.ReactNode => {
    const dropDownMenuProps: MenuProps = {
      items: PRESET_COLOR_MAP.map((preset, index) => {
        return { key: index, label: preset.name };
      }),
      // TODO key is a number, but MenuInfo assumes keys will always be strings
      //   if future versions of antd make this type more permissive, remove ugly double-cast
      onClick: ({ key }): void => props.onApplyColorPresets(PRESET_COLOR_MAP[key as unknown as number].colors),
    };

    const singleChannelTitle = singleChannelMode ? (
      "Turn off single channel mode"
    ) : (
      <>
        <div>Turn on single channel mode</div>
        <div>Use arrow keys to navigate</div>
      </>
    );

    return (
      <div className="channel-settings-header">
        <Dropdown trigger={["click"]} menu={dropDownMenuProps} getPopupContainer={getDropdownContainer}>
          <Button>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px" }}>
              Apply palette
              <ViewerIcon type="dropdownArrow" style={{ fontSize: "14px" }} />
            </div>
          </Button>
        </Dropdown>

        <div style={{ alignSelf: "end", width: "40%" }}>
          <Tooltip title={singleChannelTitle}>
            <Checkbox
              name="Single channel mode"
              checked={singleChannelMode}
              onChange={({ target }) => changeViewerSetting("singleChannelMode", target.checked)}
            >
              Single channel mode
            </Checkbox>
          </Tooltip>
        </div>
      </div>
    );
  };

  const renderTab = (thisTab: ControlTab, icon: React.ReactNode): React.ReactNode => (
    <Tooltip title={ControlTabNames[thisTab]} placement="right">
      <Button
        aria-label={ControlTabNames[thisTab]}
        className={tab === thisTab ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
        onClick={() => setTab(thisTab)}
        icon={typeof icon === "string" ? icon : undefined}
      >
        {typeof icon === "object" && icon}
      </Button>
    </Tooltip>
  );

  const collapseLabel = props.collapsed ? "Show panel" : "Hide panel";

  return (
    <div className="control-panel-col-container" ref={containerRef}>
      <div className="control-panel-tab-col" style={{ flex: "0 0 50px" }}>
        <Tooltip title={collapseLabel} placement="right">
          <Button
            aria-label={collapseLabel}
            className={"ant-btn-icon-only btn-collapse" + (props.collapsed ? " btn-collapse-collapsed" : "")}
            onClick={() => props.setCollapsed(!props.collapsed)}
          >
            <ViewerIcon type="closePanel" />
          </Button>
        </Tooltip>

        <div className="tab-divider" />

        {renderTab(ControlTab.Channels, <ViewerIcon type="channels" />)}
        {renderTab(ControlTab.Advanced, <ViewerIcon type="preferences" />)}
        {props.visibleControls.metadataViewer && renderTab(ControlTab.Metadata, <ViewerIcon type="metadata" />)}
      </div>
      <div className="control-panel-col" style={{ flex: "0 0 450px" }} ref={columnRef}>
        <div className="control-panel-title-container">
          <h2>{ControlTabNames[tab]}</h2>
          {tab === ControlTab.Channels && (
            <CopySettingsButton
              imageName={props.imageName}
              scrollContainer={columnRef.current}
              hide={props.collapsed}
              getDropdownContainer={getDropdownContainer}
            />
          )}
        </div>
        {visibleControls.colorPresetsDropdown && tab === ControlTab.Channels && renderChannelSettingsHeader()}
        {hasImage && (
          <div className="control-panel-content">
            {tab === ControlTab.Channels && (
              <ChannelsWidget
                channelDataChannels={props.channelDataChannels}
                channelGroupedByType={props.channelGroupedByType}
                saveIsosurface={props.saveIsosurface}
                onColorChangeComplete={props.onColorChangeComplete}
                onApplyColorPresets={props.onApplyColorPresets}
                filterFunc={props.filterFunc}
                viewerChannelSettings={viewerChannelSettings}
                getDropdownContainer={getDropdownContainer}
                scrollContainer={columnRef.current}
                controlPanelCollapsed={props.collapsed}
              />
            )}
            {tab === ControlTab.Advanced && (
              <AdvancedSettings
                visibleControls={visibleControls}
                resetToDefaultViewerState={resetToDefaultViewerState}
              />
            )}
            {tab === ControlTab.Metadata && <MetadataViewer metadata={props.metadata} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default ControlPanel;
