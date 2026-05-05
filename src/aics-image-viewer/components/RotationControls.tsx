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

const PIPS = {
  mode: "positions",
  values: [0, 25, 50, 75, 100],
  density: 25,
};

const RotationSlider: React.FC<RotationSliderProps> = ({ label, onChange }) => {
  const [delta, setDelta] = React.useState(0);

  const onUpdate = React.useCallback(
    ([value]: number[]) => {
      setDelta((prev) => {
        onChange(value - prev);
        return value;
      });
    },
    [onChange]
  );

  const onRelease = React.useCallback(() => setDelta(0), []);

  return (
    <SliderRow label={label} min={-90} max={90} start={delta} onUpdate={onUpdate} onChange={onRelease} pips={PIPS} />
  );
};

const RotationControls: React.FC<RotationControlsProps> = ({ view3d }) => {
  return (
    <div style={{ padding: "18px 16px 22px" }}>
      <RotationSlider label="X" onChange={console.log} />
    </div>
  );
};

export default RotationControls;
