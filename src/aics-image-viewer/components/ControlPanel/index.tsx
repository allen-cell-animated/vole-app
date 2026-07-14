import type { VolumeDims } from "@aics/vole-core";
import { Button, Checkbox, Collapse, type CollapseProps, Dropdown, Flex, type MenuProps, Select, Tooltip } from "antd";
import type { MenuInfo } from "rc-menu/lib/interface";
import React from "react";

import { PRESET_COLOR_MAP } from "../../shared/constants";
import type { MetadataRecord } from "../../shared/types";
import { select, useViewerState } from "../../state/store";

import ChannelsWidget, { type ChannelsWidgetProps } from "../ChannelsWidget";
import CustomizeWidget, { type CustomizeWidgetProps } from "../CustomizeWidget";
import GlobalVolumeControls, { type GlobalVolumeControlsProps } from "../GlobalVolumeControls";
import MetadataViewer from "../MetadataViewer";
import ResolutionControls from "../ResolutionControls";
import ViewerIcon from "../shared/ViewerIcon";

import "./styles.css";

interface ControlPanelProps extends ChannelsWidgetProps, GlobalVolumeControlsProps, CustomizeWidgetProps {
  hasImage: boolean;
  visibleControls: GlobalVolumeControlsProps["visibleControls"] &
    CustomizeWidgetProps["visibleControls"] & {
      colorPresetsDropdown: boolean;
      metadataViewer: boolean;
      scaleLevelControls: boolean;
    };
  metadata: MetadataRecord;
  multiscaleDims?: VolumeDims[];
  multiscaleIndex?: number;
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
  const offsetScaleLevelForPlayback = useViewerState(select("offsetScaleLevelForPlayback"));
  const playbackScaleLevelOffset = useViewerState(select("playbackScaleLevelOffset"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  const containerRef = React.useRef<HTMLDivElement>(null);
  const getDropdownContainer = (): HTMLElement => containerRef.current ?? document.body;

  const { viewerChannelSettings, visibleControls, hasImage, multiscaleDims, multiscaleIndex } = props;

  // TODO key is a number, but MenuInfo assumes keys will always be strings
  //   if future versions of antd make this type more permissive, remove ugly double-cast
  const makeTurnOnPresetFn = ({ key }: MenuInfo): void =>
    props.onApplyColorPresets(PRESET_COLOR_MAP[key as unknown as number].colors);

  const renderChannelSettingsHeader = (): React.ReactNode => {
    const dropDownMenuProps: MenuProps = {
      items: PRESET_COLOR_MAP.map((preset, index) => {
        return { key: index, label: preset.name };
      }),
      onClick: makeTurnOnPresetFn,
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

  // TODO this can just be a component...?
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

    const showResolution =
      multiscaleDims !== undefined && multiscaleDims.length > 1 && visibleControls.scaleLevelControls;
    if (showResolution) {
      items.push({
        key: 2,
        label: "OME-Zarr Settings",
        children: (
          <div style={{ padding: "18px 16px 22px" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 15 }}>
              <ResolutionControls
                multiscaleDims={multiscaleDims}
                multiscaleIndex={multiscaleIndex}
                getPopupContainer={getDropdownContainer}
              />
            </div>
            {multiscaleIndex !== undefined && multiscaleDims[multiscaleIndex].shape[0] > 1 && (
              <div style={{ marginLeft: 76, color: "var(--color-controlpanel-text)" }}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={offsetScaleLevelForPlayback}
                  onChange={({ target }) => changeViewerSetting("offsetScaleLevelForPlayback", target.checked)}
                />
                During playback, reduce by{" "}
                <Select
                  size="small"
                  options={Array.from({ length: multiscaleDims.length - 1 }, (_, i) => ({
                    value: i + 1,
                    label: i + 1,
                  }))}
                  value={playbackScaleLevelOffset}
                  disabled={!offsetScaleLevelForPlayback}
                  onChange={(value) => changeViewerSetting("playbackScaleLevelOffset", value)}
                  getPopupContainer={getDropdownContainer}
                />{" "}
                level(s)
              </div>
            )}
          </div>
        ),
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
            <Button onClick={resetToDefaultViewerState}>Clear all settings</Button>
          </Tooltip>
        </div>
      </Flex>
    );
  };

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
      <div className="control-panel-col" style={{ flex: "0 0 450px" }}>
        <h2 className="control-panel-title">{ControlTabNames[tab]}</h2>
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
              />
            )}
            {tab === ControlTab.Advanced && renderAdvancedSettings()}
            {tab === ControlTab.Metadata && <MetadataViewer metadata={props.metadata} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default ControlPanel;
