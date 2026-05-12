import type { CameraState, View3d } from "@aics/vole-core";
import { Button } from "antd";
import React from "react";

import { ViewMode } from "../shared/enums";
import { select, useViewerState } from "../state/store";

import SliderRow from "./shared/SliderRow";

// const PIPS = {
//   mode: "positions",
//   values: [0, 25, 50, 75, 100],
//   density: 25,
// };

type Tuple3 = [number, number, number];

const toRadians = (deg: number): number => deg * (Math.PI / 180);

const add = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => [ax + bx, ay + by, az + bz];
const sub = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => [ax - bx, ay - by, az - bz];
const mulScalar = ([x, y, z]: Tuple3, n: number): Tuple3 => [x * n, y * n, z * n];

const length = ([x, y, z]: Tuple3): number => Math.sqrt(x * x + y * y + z * z);
const normalize = (vec: Tuple3): Tuple3 => mulScalar(vec, 1.0 / length(vec));

const cross = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => {
  return [ay * bz - by * az, az * bx - bz * ax, ax * by - bx * ay];
};

const vecToTarget = (state: CameraState): Tuple3 => sub(state.target, state.position);

const rotateHorizontal = (state: CameraState, deg: number): Partial<CameraState> => {
  const rad = toRadians(deg);
  const toTarget = vecToTarget(state);
  const forward = normalize(toTarget);
  const right = cross(forward, state.up);
  const nextForward = add(mulScalar(forward, Math.cos(rad)), mulScalar(right, -Math.sin(rad)));
  const distance = length(toTarget);
  const position = sub(state.target, mulScalar(nextForward, distance));
  return { position };
};

const rotateVertical = (state: CameraState, deg: number): Partial<CameraState> => {
  const rad = toRadians(deg);
  const toTarget = vecToTarget(state);
  const forward = normalize(toTarget);
  const nextForward = add(mulScalar(forward, Math.cos(rad)), mulScalar(state.up, -Math.sin(rad)));
  const up = add(mulScalar(state.up, Math.cos(rad)), mulScalar(forward, Math.sin(rad)));
  const distance = length(toTarget);
  const position = sub(state.target, mulScalar(nextForward, distance));
  return { position, up };
};

const roll = (state: CameraState, deg: number): Partial<CameraState> => {
  const rad = toRadians(deg);
  const forward = normalize(vecToTarget(state));
  const right = cross(forward, state.up);
  const up = add(mulScalar(state.up, Math.cos(rad)), mulScalar(right, Math.sin(rad)));
  return { up };
};

/** Creates a callback that performs some action on the camera, by applying `transform` to the current camera state. */
const useCameraCallback = <T extends any[]>(
  transform: (state: CameraState, ...args: T) => Partial<CameraState>,
  view3d: View3d
): ((...args: T) => void) => {
  return React.useCallback(
    (...args: T) => {
      const state = view3d.getCameraState();
      const nextState = transform(state, ...args);
      view3d.setCameraState(nextState);
    },
    [view3d, transform]
  );
};

const useCameraJumpCallback = (getPosition: (dist: number) => Tuple3, view3d: View3d, yUp = false): (() => void) => {
  return useCameraCallback((state) => {
    const dist = length(vecToTarget(state));
    const position = add(getPosition(dist), state.target);
    return { position, up: yUp ? [0, 1, 0] : [1, 0, 0] };
  }, view3d);
};

type VectorFn = (len: number) => Tuple3;
const X_MINUS: VectorFn = (len) => [-len, 0, 0];
const X_PLUS: VectorFn = (len) => [len, 0, 0];
const Y_MINUS: VectorFn = (len) => [0, -len, 0];
const Y_PLUS: VectorFn = (len) => [0, len, 0];
const Z_MINUS: VectorFn = (len) => [0, 0, -len];
const Z_PLUS: VectorFn = (len) => [0, 0, len];

const RotationSlider: React.FC<{ label: string; onChange: (delta: number) => void; disabled?: boolean }> = (props) => {
  const { label, onChange, disabled } = props;
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
    <SliderRow
      label={label}
      min={-90}
      max={90}
      start={delta}
      onUpdate={onUpdate}
      onChange={onRelease}
      disabled={disabled}
    />
  );
};

export type RotationControlsProps = { view3d: View3d };

const RotationControls: React.FC<RotationControlsProps> = ({ view3d }) => {
  const viewMode = useViewerState(select("viewMode"));
  const disable = viewMode !== ViewMode.threeD;

  const handleRotateHorizontal = useCameraCallback(rotateHorizontal, view3d);
  const handleRotateVertical = useCameraCallback(rotateVertical, view3d);
  const handleRoll = useCameraCallback(roll, view3d);

  const jumpXMinus = useCameraJumpCallback(X_MINUS, view3d, true);
  const jumpXPlus = useCameraJumpCallback(X_PLUS, view3d, true);
  const jumpYMinus = useCameraJumpCallback(Y_MINUS, view3d);
  const jumpYPlus = useCameraJumpCallback(Y_PLUS, view3d);
  const jumpZMinus = useCameraJumpCallback(Z_MINUS, view3d, true);
  const jumpZPlus = useCameraJumpCallback(Z_PLUS, view3d, true);

  return (
    <div style={{ padding: "18px 16px 22px" }}>
      <SliderRow label="jump to">
        <Button onClick={jumpXMinus} disabled={disable}>
          -X
        </Button>
        <Button onClick={jumpXPlus} disabled={disable}>
          +X
        </Button>
        <Button onClick={jumpYMinus} disabled={disable}>
          -Y
        </Button>
        <Button onClick={jumpYPlus} disabled={disable}>
          +Y
        </Button>
        <Button onClick={jumpZMinus} disabled={disable}>
          -Z
        </Button>
        <Button onClick={jumpZPlus} disabled={disable}>
          +Z
        </Button>
      </SliderRow>
      <RotationSlider label="horizontal" onChange={handleRotateHorizontal} disabled={disable} />
      <RotationSlider label="vertical" onChange={handleRotateVertical} disabled={disable} />
      <RotationSlider label="roll" onChange={handleRoll} disabled={disable} />
    </div>
  );
};

export default RotationControls;
