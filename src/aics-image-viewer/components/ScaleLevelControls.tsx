import { VolumeDims } from "@aics/vole-core/es/types/VolumeDims";
import Checkbox from "antd/es/checkbox/Checkbox";
import React, { useCallback } from "react";

import { ViewerSettingUpdater } from "./ViewerStateProvider/types";

import SliderRow from "./shared/SliderRow";
import { connectToViewerState } from "./ViewerStateProvider";

export type ScaleLevelControlsProps = {
  multiscaleDims: VolumeDims[];
  multiscaleLevel?: number;

  // from viewer state
  scaleLevelRange: [number, number];
  exactScaleLevel: number;
  useExactScaleLevel: boolean;
  changeViewerSetting: ViewerSettingUpdater;
};

const ScaleLevelControls: React.FC<ScaleLevelControlsProps> = (props) => {
  const { scaleLevelRange, exactScaleLevel, useExactScaleLevel, changeViewerSetting } = props;
  const onSliderChange = useCallback(
    ([min, max]: number[]) => {
      if (useExactScaleLevel) {
        changeViewerSetting("exactScaleLevel", min);
      } else {
        changeViewerSetting("scaleLevelRange", [min, max]);
      }
    },
    [useExactScaleLevel, changeViewerSetting]
  );
  return (
    <>
      <ul>
        {props.multiscaleDims.map(({ shape: [t, c, z, y, x] }, index) => (
          <li style={index === props.multiscaleLevel ? { fontWeight: "bold" } : {}} key={index}>
            {`level ${index}: ${x}x${y}x${z}, ${t} timesteps, ${c} channels`}
          </li>
        ))}
      </ul>
      <SliderRow
        key={Number(useExactScaleLevel)}
        label={useExactScaleLevel ? "Scale level" : "Scale range"}
        start={useExactScaleLevel ? exactScaleLevel : scaleLevelRange}
        step={1}
        max={props.multiscaleDims.length - 1}
        formatInteger={true}
        onChange={onSliderChange}
      />
      <SliderRow label="Exact level">
        <Checkbox
          checked={useExactScaleLevel}
          onChange={({ target }) => props.changeViewerSetting("useExactScaleLevel", target.checked)}
        />
      </SliderRow>
    </>
  );
};

export default connectToViewerState(ScaleLevelControls, [
  "changeViewerSetting",
  "scaleLevelRange",
  "exactScaleLevel",
  "useExactScaleLevel",
]);
