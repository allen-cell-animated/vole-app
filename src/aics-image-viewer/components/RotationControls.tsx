import type { View3d } from "@aics/vole-core";
import React from "react";

import SliderRow from "./shared/SliderRow";

type RotationSliderProps = {
  label: string;
  onChange: (delta: number) => void;
};

export type RotationControlsProps = {
  view3d: View3d;
};

const RotationSlider: React.FC<RotationSliderProps> = ({ label, onChange }) => {
  const [rotationDelta, setRotationDelta] = React.useState(0);

  const onUpdate = React.useCallback(
    ([value]: number[]) => {
      setRotationDelta((prev) => {
        onChange(value - prev);
        return value;
      });
    },
    [onChange]
  );

  const onRelease = React.useCallback(() => setRotationDelta(0), []);

  return <SliderRow label={label} min={-90} max={90} start={rotationDelta} onUpdate={onUpdate} onChange={onRelease} />;
};

const RotationControls: React.FC<RotationControlsProps> = ({ view3d }) => {
  return (
    <div style={{ padding: "18px 16px 22px" }}>
      <RotationSlider label="X" onChange={console.log} />
    </div>
  );
};

export default RotationControls;
