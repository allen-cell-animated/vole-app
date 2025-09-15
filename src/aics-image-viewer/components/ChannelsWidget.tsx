import { Channel } from "@aics/vole-core";
import { Collapse, CollapseProps, List } from "antd";
import React from "react";

import type { IsosurfaceFormat } from "../shared/types";
import type { ColorArray, ColorObject } from "../shared/utils/colorRepresentations";
import type { ChannelGrouping, ViewerChannelSettings } from "../shared/utils/viewerChannelSettings";
import { getDisplayName } from "../shared/utils/viewerChannelSettings";
import { select, useViewerState } from "../state/store";
import type { ChannelStateKey } from "./ViewerStateProvider/types";

import ChannelsWidgetRow from "./ChannelsWidgetRow";
import SharedCheckBox from "./shared/SharedCheckBox";

export type ChannelsWidgetProps = {
  channelDataChannels: Channel[] | undefined;
  channelGroupedByType: ChannelGrouping;
  viewerChannelSettings?: ViewerChannelSettings;

  saveIsosurface: (channelIndex: number, type: IsosurfaceFormat) => void;
  onApplyColorPresets: (presets: ColorArray[]) => void;

  filterFunc?: (key: string) => boolean;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;
};

const ChannelsWidget: React.FC<ChannelsWidgetProps> = (props: ChannelsWidgetProps) => {
  const { channelGroupedByType, channelDataChannels, filterFunc, viewerChannelSettings } = props;

  const changeChannelSetting = useViewerState(select("changeChannelSetting"));
  const channelSettings = useViewerState(select("channelSettings"));

  const createCheckboxHandler = (key: ChannelStateKey) => (value: boolean, channelArray: number[]) => {
    changeChannelSetting(channelArray, { [key]: value });
  };

  const showVolumes = createCheckboxHandler("volumeEnabled");
  const showSurfaces = createCheckboxHandler("isosurfaceEnabled");

  const renderVisibilityControls = (channelArray: number[]): React.ReactNode => {
    let volChecked: number[] = [];
    let isoChecked: number[] = [];
    channelArray.forEach((channelIndex: number) => {
      const channelSetting = channelSettings[channelIndex];
      if (!channelSetting) return;
      if (channelSetting.volumeEnabled) {
        volChecked.push(channelIndex);
      }
      if (channelSetting.isosurfaceEnabled) {
        isoChecked.push(channelIndex);
      }
    });

    return (
      <>
        <SharedCheckBox allOptions={channelArray} checkedList={volChecked} onChange={showVolumes}>
          All Vol
        </SharedCheckBox>
        <SharedCheckBox
          allOptions={channelArray}
          checkedList={isoChecked}
          onChange={showSurfaces}
          // keep checkboxes lined up when channel rows have settings icon and headers don't
          style={{ flex: 5 }}
        >
          All Surf
        </SharedCheckBox>
      </>
    );
  };

  const renderChannelRow = (channelIndex: number): React.ReactNode => {
    const thisChannelSettings = channelSettings[channelIndex];

    return thisChannelSettings ? (
      <ChannelsWidgetRow
        key={`${channelIndex}_${thisChannelSettings.name}_${channelIndex}`}
        index={channelIndex}
        channelDataForChannel={channelDataChannels![channelIndex]}
        name={getDisplayName(thisChannelSettings.name, channelIndex, viewerChannelSettings)}
        channelState={thisChannelSettings}
        changeChannelSetting={changeChannelSetting}
        onColorChangeComplete={props.onColorChangeComplete}
        saveIsosurface={props.saveIsosurface}
      />
    ) : null;
  };

  const firstKey = Object.keys(channelGroupedByType)[0];
  const rows: CollapseProps["items"] =
    channelDataChannels &&
    Object.entries(channelGroupedByType)
      .filter(([key, channelArray]) => channelArray.length > 0 && (!filterFunc || filterFunc(key)))
      .map(([key, channelArray]) => {
        const children = <List itemLayout="horizontal" dataSource={channelArray} renderItem={renderChannelRow} />;

        return {
          key,
          label: key,
          children,
          extra: renderVisibilityControls(channelArray),
        };
      });

  return <Collapse bordered={false} defaultActiveKey={firstKey} items={rows} collapsible="icon" />;
};

export default ChannelsWidget;
