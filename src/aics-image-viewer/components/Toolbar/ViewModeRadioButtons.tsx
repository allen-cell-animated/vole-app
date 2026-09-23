import { Radio } from "antd";
import type { RadioChangeEvent } from "antd/lib/radio";
import React from "react";

import { ViewMode } from "../../state/types";

const radioButtonInfos = [
  {
    label: "3D",
    mode: ViewMode.threeD,
  },
  {
    label: "XY",
    mode: ViewMode.xy,
  },
  {
    label: "XZ",
    mode: ViewMode.xz,
  },
  {
    label: "YZ",
    mode: ViewMode.yz,
  },
  {
    label: "3-PLANE",
    mode: ViewMode.tripleProj,
  },
];

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
      {radioButtonInfos.map((info, index) => (
        <Radio.Button key={index} value={info.mode.toString()}>
          {info.label}
        </Radio.Button>
      ))}
    </Radio.Group>
  );
};

export default ViewModeRadioButtons;
