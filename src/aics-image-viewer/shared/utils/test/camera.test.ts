import type { CameraState } from "@aics/vole-core";
import { describe, expect, it } from "@jest/globals";

import { applyMatrix, defaultOrientedCamera, getRotationAngles, rotationMatrix } from "../camera";

const expectCameraStateToBe = (actual: CameraState, expected: CameraState, precision?: number): void => {
  console.log(actual.up, expected.up);
  const [apx, apy, apz] = actual.position;
  const [epx, epy, epz] = expected.position;
  expect(apx).toBeCloseTo(epx, precision);
  expect(apy).toBeCloseTo(epy, precision);
  expect(apz).toBeCloseTo(epz, precision);
  const [atx, aty, atz] = actual.target;
  const [etx, ety, etz] = expected.target;
  expect(atx).toBeCloseTo(etx, precision);
  expect(aty).toBeCloseTo(ety, precision);
  expect(atz).toBeCloseTo(etz, precision);
  const [aux, auy, auz] = actual.up;
  const [eux, euy, euz] = expected.up;
  expect(aux).toBeCloseTo(eux, precision);
  expect(auy).toBeCloseTo(euy, precision);
  expect(auz).toBeCloseTo(euz, precision);
};

describe("applyMatrix", () => {
  it("multiplies every vector in a `CameraState` by a matrix", () => {
    const INPUT: CameraState = {
      position: [3, 0, 0],
      up: [0, 1, 0],
      target: [0, 0, 1],
    };
    const EXPECTED: CameraState = {
      position: [0, 0, 3],
      up: [0, 2, 0],
      target: [3, 0, 0],
    };
    const actual = applyMatrix(INPUT, [0, 0, 1, 0, 2, 0, 3, 0, 0]);
    expectCameraStateToBe(actual, EXPECTED);
  });

  it("properly handles the matrix in column-major order", () => {
    const INPUT: CameraState = {
      position: [7, 11, 3],
      up: [0, 0, 1],
      target: [2, 3, 5],
    };
    const EXPECTED: CameraState = {
      position: [38, 31, 57],
      up: [3, 2, 1],
      target: [23, 17, 20],
    };
    const actual = applyMatrix(INPUT, [1, 2, 3, 2, 1, 3, 3, 2, 1]);
    expectCameraStateToBe(actual, EXPECTED);
  });
});

describe("defaultOrientedCamera", () => {
  const testDefaultOrientedCamera = (
    input: CameraState,
    position: [number, number, number],
    target: [number, number, number]
  ): void => {
    const result = defaultOrientedCamera(input);
    expectCameraStateToBe(result, { position, target, up: [0, 1, 0] });
  };

  it("returns the camera to its default orientation (towards -Z, with +Y up)", () => {
    testDefaultOrientedCamera(
      {
        position: [Math.SQRT2 / 2, 0, Math.SQRT2 / 2],
        target: [0, 0, 0],
        up: [-1, 0, 0],
      },
      [0, 0, 1],
      [0, 0, 0]
    );
  });

  it("preserves the distance from `position` to `target`", () => {
    testDefaultOrientedCamera(
      {
        position: [0, 1, 1],
        target: [0, 0, 0],
        up: [-1, 0, 0],
      },
      [0, 0, Math.SQRT2],
      [0, 0, 0]
    );
  });

  it("rotates both `target` and `position` about the origin", () => {
    testDefaultOrientedCamera({ position: [-1, -2, 1], target: [-1, -1, 1], up: [-1, 0, 0] }, [1, 1, 2], [1, 1, 1]);
  });
});

describe("getRotationAngles", () => {
  it("is the inverse of applying a rotation matrix to a default-oriented camera when -PI/2 < Y < PI/2", () => {
    const testRotationAnglesInverse = (x: number, y: number, z: number, target: [number, number, number]): void => {
      const state: CameraState = { position: [target[0], target[1], target[2] - 1], target, up: [0, 1, 0] };
      const rotated = applyMatrix(defaultOrientedCamera(state), rotationMatrix(x, y, z));
      const result = getRotationAngles(rotated);
      expect(result.x).toBeCloseTo(x);
      expect(result.y).toBeCloseTo(y);
      expect(result.z).toBeCloseTo(z);
    };

    testRotationAnglesInverse(Math.PI / 2, 0, 0, [0, 0, 0]);
    testRotationAnglesInverse(Math.PI / 2, 0, 0, [1, 2, 3]);
    testRotationAnglesInverse(Math.PI / 3, Math.PI / 3, Math.PI / 3, [3, 3, 3]);
    testRotationAnglesInverse(Math.PI, Math.PI / 4, -Math.PI, [3, 3, 3]);
    testRotationAnglesInverse(1, -0.8, 3, [0.5, 0.8, 1.2]);
  });
});
