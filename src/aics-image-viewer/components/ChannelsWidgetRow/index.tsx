import { Channel } from "@aics/vole-core";
import { Button, Checkbox, List } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import React, { useCallback, useState } from "react";

import { IsosurfaceFormat } from "../../shared/types";
import { colorArrayToObject, ColorObject, colorObjectToArray } from "../../shared/utils/colorRepresentations";
import {
  type ChannelSettingUpdater,
  type ChannelState,
  type SingleChannelSettingUpdater,
} from "../ViewerStateProvider/types";

import ColorPicker from "../ColorPicker";
import ViewerIcon from "../shared/ViewerIcon";
import TfEditor from "../TfEditor";

import "./styles.css";

interface ChannelsWidgetRowProps {
  index: number;
  name: string;
  channelState: ChannelState;
  channelDataForChannel: Channel;

  changeChannelSetting: ChannelSettingUpdater;

  saveIsosurface: (channelIndex: number, type: IsosurfaceFormat) => void;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;
}

const ChannelsWidgetRow: React.FC<ChannelsWidgetRowProps> = (props: ChannelsWidgetRowProps) => {
  const { index, changeChannelSetting, saveIsosurface, channelState } = props;
  const [controlsOpen, setControlsOpen] = useState(false);

  const changeSettingForThisChannel = useCallback<SingleChannelSettingUpdater>(
    (value) => changeChannelSetting(index, value),
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
    props.changeChannelSetting(index!, { color: color });
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

  const visibilityControls = (
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

  const createTFEditor = (): React.ReactNode => {
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
        isovalue={isovalue}
        opacity={channelState.opacity}
        volumeEnabled={channelState.volumeEnabled}
        isosurfaceEnabled={channelState.isosurfaceEnabled}
        saveIsosurface={saveThisIsosurface}
      />
    );
  };

  const renderControls = (): React.ReactNode => {
    if (!channelState.volumeEnabled && !channelState.isosurfaceEnabled) {
      return <h4 style={{ fontStyle: "italic" }}>Not currently visible</h4>;
    }
    return <>{(channelState.volumeEnabled || channelState.isosurfaceEnabled) && createTFEditor()}</>;
  };

  const rowClass = controlsOpen ? "channel-row" : "channel-row controls-closed";
  return (
    <List.Item key={index} className={rowClass}>
      <List.Item.Meta title={props.name} avatar={createColorPicker()} />
      {visibilityControls}
      {controlsOpen && <div style={{ width: "100%" }}>{renderControls()}</div>}
    </List.Item>
  );
};

export default ChannelsWidgetRow;
