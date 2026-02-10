import type { Channel } from "@aics/vole-core";
import { Collapse, type CollapseProps, List } from "antd";
import React from "react";
import { useShallow } from "zustand/shallow";

import type { IsosurfaceFormat } from "../shared/types";
import type { ColorArray, ColorObject } from "../shared/utils/colorRepresentations";
import type { ChannelGrouping, ViewerChannelSettings } from "../shared/utils/viewerChannelSettings";
import { getDisplayName } from "../shared/utils/viewerChannelSettings";
import { select, useViewerState, type ViewerStore } from "../state/store";
import type { ChannelState } from "../state/types";

import ChannelsWidgetRow from "./ChannelsWidgetRow";
import SharedCheckBox from "./shared/SharedCheckBox";

/** A quick custom hook to grab a single state field from every channel */
const useSelectFromAllChannels = <K extends keyof ChannelState>(
  key: K
): ((store: ViewerStore) => ChannelState[K][]) => {
  return useShallow(({ channelSettings }: ViewerStore) => {
    return channelSettings.map((settings) => settings[key]);
  });
};

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
  const selectVolumeEnabled = useSelectFromAllChannels("volumeEnabled");
  const selectIsosurfaceEnabled = useSelectFromAllChannels("isosurfaceEnabled");
  const selectNames = useSelectFromAllChannels("name");
  const volumeEnabled = useViewerState(selectVolumeEnabled);
  const isosurfaceEnabled = useViewerState(selectIsosurfaceEnabled);
  const channelNames = useViewerState(selectNames);
  const singleChannelMode = useViewerState(select("singleChannelMode"));

  const collapseClass = singleChannelMode ? "single-channel-mode" : "";

  const createCheckboxHandler = (key: keyof ChannelState) => (value: boolean, channelArray: number[]) => {
    changeChannelSetting(channelArray, { [key]: value });
  };

  const showVolumes = createCheckboxHandler("volumeEnabled");
  const showSurfaces = createCheckboxHandler("isosurfaceEnabled");

  const renderVisibilityControls = (channelArray: number[]): React.ReactNode => {
    if (singleChannelMode) {
      return null;
    }

    const volChecked: number[] = [];
    const isoChecked: number[] = [];
    channelArray.forEach((channelIndex: number) => {
      if (volumeEnabled[channelIndex]) {
        volChecked.push(channelIndex);
      }
      if (isosurfaceEnabled[channelIndex]) {
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
    const channelName = channelNames[channelIndex];
    return channelName ? (
      <ChannelsWidgetRow
        key={channelIndex}
        index={channelIndex}
        channelDataForChannel={channelDataChannels![channelIndex]}
        name={getDisplayName(channelName, channelIndex, viewerChannelSettings)}
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

  return (
    <Collapse className={collapseClass} bordered={false} defaultActiveKey={firstKey} items={rows} collapsible="icon" />
  );
};

export default ChannelsWidget;
