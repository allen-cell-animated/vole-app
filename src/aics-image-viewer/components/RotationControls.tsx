import type { CameraState, View3d } from "@aics/vole-core";
import { Button } from "antd";
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

const distanceToTarget = (state: CameraState): number => {
  const [xPos, yPos, zPos] = state.position;
  const [xTarget, yTarget, zTarget] = state.target;
  const xDist2 = Math.pow(xPos - xTarget, 2);
  const yDist2 = Math.pow(yPos - yTarget, 2);
  const zDist2 = Math.pow(zPos - zTarget, 2);
  return Math.sqrt(xDist2 + yDist2 + zDist2);
};

const useCameraJumpCallback = (
  getPosition: (dist: number) => [number, number, number],
  view3d: View3d,
  yUp = false
): (() => void) => {
  return React.useCallback(() => {
    const state = view3d.getCameraState();
    const dist = distanceToTarget(state);
    const [xPos, yPos, zPos] = getPosition(dist);
    const [xTarget, yTarget, zTarget] = state.target;
    view3d.setCameraState({
      position: [xTarget + xPos, yTarget + yPos, zTarget + zPos],
      up: yUp ? [0, 1, 0] : [1, 0, 0],
    });
  }, [view3d, yUp, getPosition]);
};

type VectorFn = (len: number) => [number, number, number];
const X_MINUS: VectorFn = (len) => [-len, 0, 0];
const X_PLUS: VectorFn = (len) => [len, 0, 0];
const Y_MINUS: VectorFn = (len) => [0, -len, 0];
const Y_PLUS: VectorFn = (len) => [0, len, 0];
const Z_MINUS: VectorFn = (len) => [0, 0, -len];
const Z_PLUS: VectorFn = (len) => [0, 0, len];

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
  const jumpXMinus = useCameraJumpCallback(X_MINUS, view3d, true);
  const jumpXPlus = useCameraJumpCallback(X_PLUS, view3d, true);
  const jumpYMinus = useCameraJumpCallback(Y_MINUS, view3d);
  const jumpYPlus = useCameraJumpCallback(Y_PLUS, view3d);
  const jumpZMinus = useCameraJumpCallback(Z_MINUS, view3d, true);
  const jumpZPlus = useCameraJumpCallback(Z_PLUS, view3d, true);

  return (
    <div style={{ padding: "18px 16px 22px" }}>
      <SliderRow label="jump to">
        <Button onClick={jumpXMinus}>-X</Button>
        <Button onClick={jumpXPlus}>+X</Button>
        <Button onClick={jumpYMinus}>-Y</Button>
        <Button onClick={jumpYPlus}>+Y</Button>
        <Button onClick={jumpZMinus}>-Z</Button>
        <Button onClick={jumpZPlus}>+Z</Button>
      </SliderRow>
      <RotationSlider label="X" onChange={console.log} />
    </div>
  );
};

export default RotationControls;
