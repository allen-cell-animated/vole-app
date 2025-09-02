import { Checkbox } from "antd";
import React from "react";

import { select, useViewerState } from "../state/store";

import SliderRow from "./shared/SliderRow";

type GlobalVolumeControlKey = "maskAlpha" | "brightness" | "density" | "levels";

export interface GlobalVolumeControlsProps {
  imageName: string | undefined;
  pixelSize: [number, number, number];
  visibleControls: {
    alphaMaskSlider: boolean;
    brightnessSlider: boolean;
    densitySlider: boolean;
    levelsSliders: boolean;
    interpolationControl: boolean;
  };
}

const GlobalVolumeControls: React.FC<GlobalVolumeControlsProps> = (props) => {
  const maskAlpha = useViewerState(select("maskAlpha"));
  const brightness = useViewerState(select("brightness"));
  const density = useViewerState(select("density"));
  const levels = useViewerState(select("levels"));
  const interpolationEnabled = useViewerState(select("interpolationEnabled"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  const createSliderRow = (
    label: string,
    start: number | number[],
    max: number,
    propKey: GlobalVolumeControlKey
  ): React.ReactNode => {
    const onUpdate = (_strValues: string[], _handle: number, values: number[]): void => {
      const selectValue = values.length === 1 ? values[0] : (values as [number, number, number]);
      changeViewerSetting(propKey, selectValue);
    };

    return <SliderRow label={label} start={start} max={max} onUpdate={onUpdate} />;
  };

  const { visibleControls: showControls } = props;

  return (
    <div style={{ paddingTop: 18, paddingBottom: 22 }}>
      {showControls.alphaMaskSlider && createSliderRow("mask cell", maskAlpha, 100, "maskAlpha")}
      {showControls.brightnessSlider && createSliderRow("brightness", brightness, 100, "brightness")}
      {showControls.densitySlider && createSliderRow("density", density, 100, "density")}
      {showControls.levelsSliders && createSliderRow("levels", levels, 255, "levels")}
      {showControls.interpolationControl && (
        <SliderRow label="interpolate">
          <Checkbox
            checked={interpolationEnabled}
            onChange={({ target }) => changeViewerSetting("interpolationEnabled", target.checked)}
          />
        </SliderRow>
      )}
    </div>
  );
};

export default GlobalVolumeControls;
