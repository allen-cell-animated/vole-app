import { Radio } from "antd";
import { RadioChangeEvent } from "antd/lib/radio";
import React from "react";

import { ViewMode } from "../../shared/enums";

const viewModes = [ViewMode.threeD, ViewMode.xy, ViewMode.xz, ViewMode.yz];

interface ViewModeRadioButtonsProps {
  mode: ViewMode;
  onViewModeChange: (newMode: ViewMode) => void;
}

const ViewModeRadioButtons: React.FC<ViewModeRadioButtonsProps> = (props) => {
  const onChangeButton = ({ target }: RadioChangeEvent): void => {
    if (props.mode !== target.value) {
      props.onViewModeChange(target.value);
    }
  };

  return (
    <Radio.Group onChange={onChangeButton} value={props.mode.toString()}>
      {viewModes.map((mode, index) => (
        <Radio.Button key={index} value={mode.toString()}>
          {mode}
        </Radio.Button>
      ))}
    </Radio.Group>
  );
};

export default ViewModeRadioButtons;
