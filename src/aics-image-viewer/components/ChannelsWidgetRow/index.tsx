import type { Channel } from "@aics/vole-core";
import { Button, Checkbox, List } from "antd";
import type { CheckboxChangeEvent } from "antd/lib/checkbox";
import React, { useCallback, useState } from "react";

import type { IsosurfaceFormat } from "../../shared/types";
import { colorArrayToObject, type ColorObject, colorObjectToArray } from "../../shared/utils/colorRepresentations";
import { select, useViewerState } from "../../state/store";
import type { ChannelState } from "../../state/types";

import ColorPicker from "../ColorPicker";
import ViewerIcon from "../shared/ViewerIcon";
import TfEditor from "../TfEditor";

import "./styles.css";

interface ChannelsWidgetRowProps {
  index: number;
  name: string;
  channelDataForChannel: Channel;

  saveIsosurface: (channelIndex: number, type: IsosurfaceFormat) => void;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;
}

const ChannelsWidgetRow: React.FC<ChannelsWidgetRowProps> = (props: ChannelsWidgetRowProps) => {
  const { index, saveIsosurface } = props;

  const changeChannelSetting = useViewerState(select("changeChannelSetting"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));
  const channelState = useViewerState(({ channelSettings }) => channelSettings[props.index]);
  const singleChannelMode = useViewerState(select("singleChannelMode"));
  const singleChannelIndex = useViewerState(select("singleChannelIndex"));

  const [_controlsOpen, setControlsOpen] = useState(false);
  // Don't show controls for non-selected channels in single-channel mode
  const controlsOpen = _controlsOpen && !(singleChannelMode && singleChannelIndex !== index);

  const onClickChannel = useCallback(() => {
    if (singleChannelMode) {
      changeViewerSetting("singleChannelIndex", index);
    }
  }, [singleChannelMode, changeViewerSetting, index]);

  const changeSettingForThisChannel = useCallback(
    (value: Partial<ChannelState>) => changeChannelSetting(index, value),
    [changeChannelSetting, index]
  );

  const saveThisIsosurface = useCallback(
    (format: IsosurfaceFormat) => saveIsosurface(index, format),
    [saveIsosurface, index]
  );

  const volumeCheckHandler = ({ target }: CheckboxChangeEvent): void => {
    changeChannelSetting(index, { volumeEnabled: target.checked });
  };

  const isosurfaceCheckHandler = ({ target }: CheckboxChangeEvent): void => {
    changeChannelSetting(index, { isosurfaceEnabled: target.checked });
  };

  const onColorChange = (newRGB: ColorObject, _oldRGB?: ColorObject, index?: number): void => {
    const color = colorObjectToArray(newRGB);
    changeChannelSetting(index!, { color });
  };

  const createColorPicker = (): React.ReactNode => (
    <ColorPicker
      color={colorArrayToObject(channelState.color)}
      onColorChange={onColorChange}
      onColorChangeComplete={props.onColorChangeComplete}
      disableAlpha={true}
      idx={index}
      width={18}
    />
  );

  const thisChannelOnly = singleChannelMode && singleChannelIndex === index;

  const visibilityControls = singleChannelMode ? (
    // TODO text alignment?
    <div className={`channel-visibility-controls${thisChannelOnly ? " single-channel" : ""}`}>
      <span className="single-channel-text">{thisChannelOnly ? "Showing this volume only" : ""}</span>
    </div>
  ) : (
    <div className="channel-visibility-controls">
      <Checkbox checked={channelState.volumeEnabled} onChange={volumeCheckHandler}>
        Vol
      </Checkbox>
      <Checkbox checked={channelState.isosurfaceEnabled} onChange={isosurfaceCheckHandler}>
        Surf
      </Checkbox>
      <Button
        icon={<ViewerIcon type="preferences" style={{ fontSize: "16px" }} />}
        onClick={() => setControlsOpen(!controlsOpen)}
        title="Open channel settings"
        type="text"
      />
    </div>
  );

  const renderControls = (): React.ReactNode => {
    const showEditor = singleChannelMode
      ? singleChannelIndex === index
      : channelState.volumeEnabled || channelState.isosurfaceEnabled;

    if (!showEditor) {
      return <h4 style={{ fontStyle: "italic" }}>Not currently visible</h4>;
    }

    // TODO this is most of `channelState`... should `TfEditor` just get `channelState`?
    const { controlPoints, colorizeEnabled, colorizeAlpha, useControlPoints, ramp, plotMin, plotMax, isovalue } =
      channelState;
    return (
      <TfEditor
        id={"TFEditor" + index}
        width={418}
        height={145}
        channelData={props.channelDataForChannel}
        controlPoints={controlPoints}
        changeChannelSetting={changeSettingForThisChannel}
        colorizeEnabled={colorizeEnabled}
        colorizeAlpha={colorizeAlpha}
        useControlPoints={useControlPoints}
        ramp={ramp}
        plotMin={plotMin}
        plotMax={plotMax}
        keepIntensityRange={channelState.keepIntensityRange}
        isovalue={isovalue}
        opacity={channelState.opacity}
        volumeEnabled={singleChannelMode ? singleChannelIndex === index : channelState.volumeEnabled}
        isosurfaceEnabled={channelState.isosurfaceEnabled && !singleChannelMode}
        saveIsosurface={saveThisIsosurface}
      />
    );
  };

  const rowClass = `channel-row${controlsOpen ? " controls-closed" : ""}${thisChannelOnly ? " single-channel" : ""}`;
  return (
    <List.Item key={index} className={rowClass} onClick={onClickChannel}>
      <List.Item.Meta title={props.name} avatar={createColorPicker()} />
      {visibilityControls}
      {controlsOpen && <div style={{ width: "100%" }}>{renderControls()}</div>}
      <div className="channel-row-border" />
    </List.Item>
  );
};

export default ChannelsWidgetRow;
