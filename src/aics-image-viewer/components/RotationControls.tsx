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

const mulMatrix = ([a11, a12, a13, a21, a22, a23, a31, a32, a33]: Matrix3x3, [x, y, z]: Tuple3): Tuple3 => {
  return [x * a11 + y * a21 + z * a31, x * a12 + y * a22 + z * a32, x * a13 + y * a23 + z * a33];
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

// const rotateHorizontal = (state: CameraState, deg: number): Partial<CameraState> => {
//   const rad = toRadians(deg);
//   const { forward, right, up, distance } = getBasis(state);
//   const nextForward = add(mulScalar(forward, Math.cos(rad)), mulScalar(right, -Math.sin(rad)));
//   return { position: sub(state.target, mulScalar(nextForward, distance)), up };
// };

// const rotateVertical = (state: CameraState, deg: number): Partial<CameraState> => {
//   const rad = toRadians(deg);
//   const { forward, up, distance } = getBasis(state);
//   const nextForward = add(mulScalar(forward, Math.cos(rad)), mulScalar(up, -Math.sin(rad)));
//   const nextUp = add(mulScalar(up, Math.cos(rad)), mulScalar(forward, Math.sin(rad)));
//   return { position: sub(state.target, mulScalar(nextForward, distance)), up: nextUp };
// };

// const roll = (state: CameraState, deg: number): Partial<CameraState> => {
//   const rad = toRadians(deg);
//   const { right, up } = getBasis(state);
//   return { up: add(mulScalar(up, Math.cos(rad)), mulScalar(right, Math.sin(rad))) };
// };

const rotateMatX = (rad: number): Matrix3x3 => {
  return [1, 0, 0, 0, Math.cos(rad), -Math.sin(rad), 0, Math.sin(rad), Math.cos(rad)];
};

const rotateMatY = (rad: number): Matrix3x3 => {
  return [Math.cos(rad), 0, Math.sin(rad), 0, 1, 0, -Math.sin(rad), 0, Math.cos(rad)];
};

const rotateMatZ = (rad: number): Matrix3x3 => {
  return [Math.cos(rad), -Math.sin(rad), 0, Math.sin(rad), Math.cos(rad), 0, 0, 0, 1];
};

const applyRotation = (state: CameraState, rotation: { x: number; y: number; z: number }): CameraState => {
  const currentRotation = getRotationAngles(state, DEFAULT_CAMERA_STATE);
  const rotatedX = applyMatrix(state, rotateMatX(rotation.x + currentRotation.x));
  const rotatedY = applyMatrix(rotatedX, rotateMatY(rotation.y + currentRotation.y));
  return applyMatrix(rotatedY, rotateMatZ(rotation.z + currentRotation.z));
};

/**
 * Returns the X, Y, and Z rotation angles (in degrees) that, when applied in order
 * via `applyMatrix(state, rotateMatX/Y/Z(deg))` to `defaultState`, reorient the camera
 * to match the orientation of `state`. Inverse of the X/Y/Z rotation handlers.
 *
 * Decomposition uses intrinsic Tait-Bryan XYZ ordering. In the gimbal-lock case
 * (|y| = 90°), Z is set to 0 and the remaining rotation is folded into X.
 */
const getRotationAngles = (state: CameraState, defaultState: CameraState): { x: number; y: number; z: number } => {
  // Build an orthonormal basis (right, up, -forward) and store its vectors as columns.
  // Layout matches the row-major [a11..a33] convention used by `mulMatrix`.
  const basisMatrix = (s: CameraState): Matrix3x3 => {
    const { forward, right, up } = getBasis(s);
    return [right[0], up[0], -forward[0], right[1], up[1], -forward[1], right[2], up[2], -forward[2]];
  };

  const Bc = basisMatrix(state);
  const Bd = basisMatrix(defaultState);
  const at = (M: Matrix3x3, row: number, col: number): number => M[row * 3 + col];

  // Each handler applies `M^T` (per `mulMatrix`'s convention) to the basis vectors.
  // Applying X then Y then Z to defaultState produces basis vectors
  //   Bc = Rz(z)^T * Ry(y)^T * Rx(x)^T * Bd
  // so the rotation that takes Bd to Bc (as column matrices) is
  //   R = Bc * Bd^T = (Rx(x) * Ry(y) * Rz(z))^T.
  // We want to decompose Q = R^T = Rx(x) * Ry(y) * Rz(z), so transpose while reading.
  const q = (i: number, j: number): number =>
    at(Bc, 0, j) * at(Bd, 0, i) + at(Bc, 1, j) * at(Bd, 1, i) + at(Bc, 2, j) * at(Bd, 2, i);

  // For Q = Rx(x) * Ry(y) * Rz(z):
  //   Q[0][0] =  cy*cz       Q[0][1] = -cy*sz       Q[0][2] = sy
  //   Q[1][2] = -sx*cy       Q[2][2] =  cx*cy
  const sy = Math.max(-1, Math.min(1, q(0, 2)));
  const y = Math.asin(sy);

  let x: number;
  let z: number;
  if (Math.abs(sy) < 1 - 1e-6) {
    x = Math.atan2(-q(1, 2), q(2, 2));
    z = Math.atan2(-q(0, 1), q(0, 0));
  } else {
    // Gimbal lock: x and z share an axis. Fold the combined rotation into x.
    x = Math.atan2(q(2, 1), q(1, 1));
    z = 0;
  }

  return { x, y, z };
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

  return <SliderRow label={label} min={-180} max={180} start={angle} onSlide={onUpdate} disabled={disabled} />;
};

const DEFAULT_CAMERA_STATE: CameraState = {
  position: [0, 0, 5],
  up: [0, 1, 0],
  target: [0, 0, 0],
};

export type RotationControlsProps = { view3d: View3d };

const RotationControls: React.FC<RotationControlsProps> = ({ view3d }) => {
  const viewMode = useViewerState(select("viewMode"));
  const disable = viewMode !== ViewMode.threeD;

  const [rotation, setRotation] = React.useState(() =>
    getRotationAngles(view3d.getCameraState(), DEFAULT_CAMERA_STATE)
  );

  const rotateCameraTo = useCameraCallback((state, rotation: { x: number; y: number; z: number }): CameraState => {
    return applyRotation(state, rotation);
  }, view3d);

  const handleRotate = React.useCallback(
    (axis: "x" | "y" | "z", deg: number) => {
      const rotation = getRotationAngles(view3d.getCameraState(), DEFAULT_CAMERA_STATE);
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
      <Button onClick={() => console.log(getRotationAngles(view3d.getCameraState(), DEFAULT_CAMERA_STATE))} />
    </div>
  );
};

export default RotationControls;
