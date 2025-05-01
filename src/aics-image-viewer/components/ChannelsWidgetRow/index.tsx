import { Channel } from "@aics/vole-core";
import { Button, Checkbox, List } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import React, { useCallback, useState } from "react";

import { ISOSURFACE_OPACITY_SLIDER_MAX } from "../../shared/constants";
import { IsosurfaceFormat } from "../../shared/types";
import { colorArrayToObject, ColorObject, colorObjectToArray } from "../../shared/utils/colorRepresentations";
import {
  type ChannelSettingUpdater,
  type ChannelState,
  type SingleChannelSettingUpdater,
} from "../ViewerStateProvider/types";

import ColorPicker from "../ColorPicker";
import SliderRow from "../shared/SliderRow";
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

  const volumeCheckHandler = ({ target }: CheckboxChangeEvent): void => {
    changeChannelSetting(index, { volumeEnabled: target.checked });
  };

  const isosurfaceCheckHandler = ({ target }: CheckboxChangeEvent): void => {
    changeChannelSetting(index, { isosurfaceEnabled: target.checked });
  };

  const onIsovalueChange = ([newValue]: number[]): void => changeSettingForThisChannel({ isovalue: newValue });
  const onOpacityChange = ([newValue]: number[]): void =>
    changeSettingForThisChannel({ opacity: newValue / ISOSURFACE_OPACITY_SLIDER_MAX });

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
    const { controlPoints, colorizeEnabled, colorizeAlpha, useControlPoints, ramp, lockPlotToDataRange, plotMax } =
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
        lockPlotToDataRange={lockPlotToDataRange}
        plotMax={plotMax}
      />
    );
  };

  const renderSurfaceControls = (): React.ReactNode => (
    <div>
      <SliderRow
        label="Isovalue"
        max={255}
        start={channelState.isovalue}
        onChange={onIsovalueChange}
        formatInteger={true}
      />
      <SliderRow
        label="Opacity"
        max={ISOSURFACE_OPACITY_SLIDER_MAX}
        start={channelState.opacity * ISOSURFACE_OPACITY_SLIDER_MAX}
        onChange={onOpacityChange}
        formatInteger={true}
      />
      <div className="button-row">
        <Button onClick={() => saveIsosurface(index, "GLTF")}>Export GLTF</Button>
        <Button onClick={() => saveIsosurface(index, "STL")}>Export STL</Button>
      </div>
    </div>
  );

  const renderControls = (): React.ReactNode => {
    if (!channelState.volumeEnabled && !channelState.isosurfaceEnabled) {
      return <h4 style={{ fontStyle: "italic" }}>Not currently visible</h4>;
    }
    return (
      <>
        {channelState.volumeEnabled && (
          <>
            <h4>Volume settings:</h4>
            {createTFEditor()}
          </>
        )}
        {channelState.isosurfaceEnabled && (
          <>
            <h4>Surface settings:</h4>
            {renderSurfaceControls()}
          </>
        )}
      </>
    );
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
