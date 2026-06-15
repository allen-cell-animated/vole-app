import type { CameraState, View3d } from "@aics/vole-core";
import React from "react";

/** Dumbest possible 3-dimensional vector type for doing a little linear algebra */
export type Tuple3 = [number, number, number];
/** 3x3 matrix packed into a 9-tuple in *column-major order* */
export type Matrix3x3 = [number, number, number, number, number, number, number, number, number];

const add = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => [ax + bx, ay + by, az + bz];
const sub = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => [ax - bx, ay - by, az - bz];
const mulScalar = ([x, y, z]: Tuple3, n: number): Tuple3 => [x * n, y * n, z * n];

const length = ([x, y, z]: Tuple3): number => Math.sqrt(x * x + y * y + z * z);
const normalize = (vec: Tuple3): Tuple3 => mulScalar(vec, 1.0 / length(vec));

const cross = ([ax, ay, az]: Tuple3, [bx, by, bz]: Tuple3): Tuple3 => {
  return [ay * bz - by * az, az * bx - bz * ax, ax * by - bx * ay];
};

const vecToTarget = (state: CameraState): Tuple3 => sub(state.target, state.position);

/** Multiply a matrix by a vector */
const mulMatrix = ([xx, xy, xz, yx, yy, yz, zx, zy, zz]: Matrix3x3, [x, y, z]: Tuple3): Tuple3 => {
  // Destructured elements above are named by column then row, like so:
  // ┌ xx yx zx ┐
  // │ xy yy zy │
  // └ xz yz zz ┘
  // prettier-ignore
  return [
    x * xx + y * yx + z * zx,
    x * xy + y * yy + z * zy,
    x * xz + y * yz + z * zz,
  ];
};

/** Transpose a 3x3 matrix */
const transpose = ([m00, m10, m20, m01, m11, m21, m02, m12, m22]: Matrix3x3): Matrix3x3 => {
  return [m00, m01, m02, m10, m11, m12, m20, m21, m22];
};

/** Multiply every vector in `state` by `matrix` */
export const applyMatrix = (state: CameraState, matrix: Matrix3x3): CameraState => {
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

/** Creates a XYZ rotation matrix with the given angles */
export const rotationMatrix = (x: number, y: number, z: number): Matrix3x3 => {
  const sinX = Math.sin(x);
  const cosX = Math.cos(x);
  const sinY = Math.sin(y);
  const cosY = Math.cos(y);
  const sinZ = Math.sin(z);
  const cosZ = Math.cos(z);
  return [
    cosY * cosZ,
    cosX * sinZ + sinX * sinY * cosZ,
    sinX * sinZ - cosX * sinY * cosZ,
    -cosY * sinZ,
    cosX * cosZ - sinX * sinY * sinZ,
    sinX * cosZ + cosX * sinY * sinZ,
    sinY,
    -sinX * cosY,
    cosX * cosY,
  ];
};

/**
 * Constructs a new `CameraState` equivalent to rotating `state` about the origin such that the camera returns to its
 * default *orientation* (looking towards -Z, +Y up), though not necessarily its default *position*.
 */
export const defaultOrientedCamera = (state: CameraState): CameraState => {
  const distance = length(vecToTarget(state));
  // Rotate `target` about the origin, then derive `position` from `target`
  const { x, y, z } = getRotationAngles(state);
  const matrix = transpose(rotationMatrix(x, y, z));
  const target = mulMatrix(matrix, state.target);
  return {
    target: target,
    position: add(target, [0, 0, distance]),
    up: [0, 1, 0],
  };
};

/** Extract Tait-Bryan angles from a `CameraState` */
export const getRotationAngles = (state: CameraState): { x: number; y: number; z: number } => {
  const { forward, right, up } = getBasis(state);
  const sy = Math.max(-1, Math.min(1, -forward[0]));
  const y = Math.asin(sy);

  if (Math.abs(sy) < 1 - 1e-6) {
    return {
      x: Math.atan2(forward[1], -forward[2]),
      y,
      z: Math.atan2(-up[0], right[0]),
    };
  }
  // Gimbal lock: y = ±90°, fold combined rotation into x.
  return { x: Math.atan2(up[2], up[1]), y, z: 0 };
};

/** Creates a callback that performs some action on the camera, by applying `transform` to the current camera state. */
export const useCameraCallback = <T extends any[]>(
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

/** Specialization of `useCameraCallback` to create a callback that jumps the camera to looking down the given axis */
export const useCameraJumpCallback = (
  view3d: View3d,
  axis: "x" | "y" | "z" | number,
  negative: boolean,
  yUp = false
): (() => void) => {
  return useCameraCallback((state) => {
    const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : axis === "z" ? 2 : axis;
    const v: Tuple3 = [0, 0, 0];
    const dist = length(vecToTarget(state));
    v[axisIndex] = negative ? -dist : dist;
    const position = add(v, state.target);
    return { position, up: yUp ? [0, 1, 0] : [1, 0, 0] };
  }, view3d);
};
