import type { CameraState, View3d } from "@aics/vole-core";
import { mat3, quat, vec3 } from "gl-matrix";
import React from "react";

/**
 * Converts a `vec3` to a `[number, number, number]`.
 *
 * Technically, these are already equivalent types for all the math we do here, but the `vec3` type also includes any
 * other indexable collection of `number`s, so this keeps the type checker happy.
 */
const toArray = (v: vec3): [number, number, number] => [v[0], v[1], v[2]];

const vecToTarget = (state: CameraState): vec3 => vec3.subtract(vec3.create(), state.target, state.position);

/** Transpose a 3x3 matrix */
const transpose = (matrix: mat3): mat3 => {
  const out = mat3.create();
  mat3.transpose(out, matrix);
  return out;
};

/** Multiply every vector in `state` by `matrix` */
export const applyMatrix = (state: CameraState, matrix: mat3): CameraState => {
  const position = toArray(vec3.transformMat3(vec3.create(), state.position, matrix));
  const up = toArray(vec3.transformMat3(vec3.create(), state.up, matrix));
  const target = toArray(vec3.transformMat3(vec3.create(), state.target, matrix));
  return { position, up, target };
};

type CameraBasis = { forward: vec3; right: vec3; up: vec3; distance: number };

/** Orthonormal camera basis derived from `state`. */
const getBasis = (state: CameraState): CameraBasis => {
  const toTarget = vecToTarget(state);
  const distance = vec3.length(toTarget);
  const forward = vec3.scale(vec3.create(), toTarget, 1 / distance);
  const right = vec3.cross(vec3.create(), forward, state.up);
  vec3.normalize(right, right);
  const up = vec3.cross(vec3.create(), right, forward);
  return { forward, right, up, distance };
};

/** Creates a XYZ rotation matrix with the given angles */
export const rotationMatrix = (x: number, y: number, z: number): mat3 => {
  const rotationQuat = quat.create();
  quat.rotateX(rotationQuat, rotationQuat, x);
  quat.rotateY(rotationQuat, rotationQuat, y);
  quat.rotateZ(rotationQuat, rotationQuat, z);
  const rotation = mat3.fromQuat(mat3.create(), rotationQuat);
  return rotation;
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

/**
 * Constructs a new `CameraState` equivalent to rotating `state` about the origin such that the camera returns to its
 * default *orientation* (looking towards -Z, +Y up), though not necessarily its default *position*.
 */
export const defaultOrientedCamera = (state: CameraState): CameraState => {
  const distance = vec3.length(vecToTarget(state));
  // Rotate `target` about the origin, then derive `position` from `target`
  const { x, y, z } = getRotationAngles(state);
  const matrix = transpose(rotationMatrix(x, y, z));
  const target = toArray(vec3.transformMat3(vec3.create(), state.target, matrix));
  const position = toArray(vec3.add(vec3.create(), target, vec3.fromValues(0, 0, distance)));
  return { target, position, up: [0, 1, 0] };
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
