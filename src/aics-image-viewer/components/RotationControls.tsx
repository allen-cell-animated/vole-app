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
/** 3x3 matrix packed into a 9-tuple in *column-major order* */
type Matrix3x3 = [number, number, number, number, number, number, number, number, number];

const toRadians = (deg: number): number => deg * (Math.PI / 180);
const toDegrees = (rad: number): number => rad * (180 / Math.PI);

const add = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => [ax + bx, ay + by, az + bz];
const sub = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => [ax - bx, ay - by, az - bz];
const mulScalar = ([x, y, z]: Tuple3, n: number): Tuple3 => [x * n, y * n, z * n];

const length = ([x, y, z]: Tuple3): number => Math.sqrt(x * x + y * y + z * z);
const normalize = (vec: Tuple3): Tuple3 => mulScalar(vec, 1.0 / length(vec));

const cross = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => {
  return [ay * bz - by * az, az * bx - bz * ax, ax * by - bx * ay];
};

const vecToTarget = (state: CameraState): Tuple3 => sub(state.target, state.position);

const mulMatrix = ([xx, yx, zx, xy, yy, zy, xz, yz, zz]: Matrix3x3, [x, y, z]: Tuple3): Tuple3 => {
  // prettier-ignore
  return [
    x * xx + y * yx + z * zx,
    x * xy + y * yy + z * zy,
    x * xz + y * yz + z * zz,
  ];
};

const applyMatrix = (state: CameraState, matrix: Matrix3x3): CameraState => {
  const position = mulMatrix(matrix, state.position);
  const up = mulMatrix(matrix, state.up);
  const target = mulMatrix(matrix, state.target);
  return { position, up, target };
};

type CameraBasis = { forward: Tuple3; right: Tuple3; up: Tuple3; distance: number };

/** Orthonormal camera basis derived from `state`. */
const getBasis = (state: CameraState): CameraBasis => {
  const toTarget = vecToTarget(state);
  const distance = length(toTarget);
  const forward = mulScalar(toTarget, 1 / distance);
  const right = normalize(cross(forward, state.up));
  const up = cross(right, forward);
  return { forward, right, up, distance };
};

const rotationMatrix = (x: number, y: number, z: number): Matrix3x3 => {
  const sinX = Math.sin(x);
  const cosX = Math.cos(x);
  const sinY = Math.sin(y);
  const cosY = Math.cos(y);
  const sinZ = Math.sin(z);
  const cosZ = Math.cos(z);
  // prettier-ignore
  return [
    (cosY * cosZ), (cosX * sinZ) + (sinX * sinY * cosZ), (sinX * sinZ) - (cosX * sinY * cosZ),
    (-cosY * sinZ), (cosX * cosZ) - (sinX * sinY * sinZ), (sinX * cosZ) + (cosX * sinY * sinZ),
    sinY, -sinX * cosY, cosX * cosY
  ];
};

const defaultOrientedCamera = (state: CameraState): CameraState => {
  const distance = length(vecToTarget(state));
  return {
    target: state.target,
    position: add(state.target, [0, 0, distance]),
    up: [0, 1, 0],
  };
};

const applyRotation = (state: CameraState, rotation: { x: number; y: number; z: number }): CameraState => {
  const matrix = rotationMatrix(rotation.x, rotation.y, rotation.z);
  return applyMatrix(defaultOrientedCamera(state), matrix);
};

const getRotationAngles2 = (state: CameraState): { x: number; y: number; z: number } => {
  const { forward, right, up } = getBasis(state);
  const sy = Math.max(-1, Math.min(1, right[2]));
  const y = Math.asin(sy);

  if (Math.abs(sy) < 1 - 1e-6) {
    return {
      x: Math.atan2(-up[2], -forward[2]),
      y,
      z: Math.atan2(-right[1], right[0]),
    };
  }
  // Gimbal lock: y = ±90°, fold combined rotation into x.
  return { x: Math.atan2(-forward[1], up[1]), y, z: 0 };
};

/** Creates a callback that performs some action on the camera, by applying `transform` to the current camera state. */
const useCameraCallback = <T extends any[]>(
  transform: (state: CameraState, ...args: T) => Partial<CameraState>,
  view3d: View3d
): ((...args: T) => CameraState) => {
  return React.useCallback(
    (...args: T) => {
      const state = view3d.getCameraState();
      const nextState = transform(state, ...args);
      view3d.setCameraState(nextState);
      return { ...state, ...nextState };
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

const RotationSliderNew: React.FC<{
  label: string;
  angle: number;
  onChange: (delta: number) => void;
  disabled?: boolean;
}> = (props) => {
  const { label, angle, onChange, disabled } = props;

  const onUpdate = React.useCallback(([value]: number[]) => onChange(value), [onChange]);

  return (
    <SliderRow
      label={label}
      min={-180}
      max={180}
      start={angle}
      step={1}
      onSlide={onUpdate}
      disabled={disabled}
      formatInteger={true}
    />
  );
};

export type RotationControlsProps = { view3d: View3d };

const RotationControls: React.FC<RotationControlsProps> = ({ view3d }) => {
  const viewMode = useViewerState(select("viewMode"));
  const disable = viewMode !== ViewMode.threeD;

  const [rotation, setRotation] = React.useState(() => getRotationAngles2(view3d.getCameraState()));

  const rotateCameraTo = useCameraCallback((state, rotation: { x: number; y: number; z: number }): CameraState => {
    return applyRotation(state, rotation);
  }, view3d);

  const handleRotate = React.useCallback(
    (axis: "x" | "y" | "z", deg: number) => {
      const rotation = getRotationAngles2(view3d.getCameraState());
      rotation[axis] = toRadians(deg);
      console.log(rotation, axis, toRadians(deg));
      setRotation(rotation);
      rotateCameraTo(rotation);
    },
    [rotateCameraTo, view3d]
  );

  const jumpXMinus = useCameraJumpCallback(X_MINUS, view3d, true);
  const jumpXPlus = useCameraJumpCallback(X_PLUS, view3d, true);
  const jumpYMinus = useCameraJumpCallback(Y_MINUS, view3d);
  const jumpYPlus = useCameraJumpCallback(Y_PLUS, view3d);
  const jumpZMinus = useCameraJumpCallback(Z_MINUS, view3d, true);
  const jumpZPlus = useCameraJumpCallback(Z_PLUS, view3d, true);

  return (
    <div style={{ padding: "18px 16px 22px" }}>
      <SliderRow label="jump to">
        <Button.Group style={{ width: "100%", justifyContent: "center" }}>
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
        </Button.Group>
      </SliderRow>
      <RotationSliderNew
        label="X"
        angle={toDegrees(rotation.x)}
        onChange={(deg) => handleRotate("x", deg)}
        disabled={disable}
      />
      <RotationSliderNew
        label="Y"
        angle={toDegrees(rotation.y)}
        onChange={(deg) => handleRotate("y", deg)}
        disabled={disable}
      />
      <RotationSliderNew
        label="Z"
        angle={toDegrees(rotation.z)}
        onChange={(deg) => handleRotate("z", deg)}
        disabled={disable}
      />
      <Button onClick={() => console.log(getRotationAngles2(view3d.getCameraState()))} />
    </div>
  );
};

export default RotationControls;
