import type { CameraState } from "@aics/vole-core";
import { describe, expect, it } from "@jest/globals";

import { applyMatrix, defaultOrientedCamera } from "../camera";

const expectCameraStateToBe = (actual: CameraState, expected: CameraState): void => {
  const [apx, apy, apz] = actual.position;
  const [epx, epy, epz] = expected.position;
  expect(apx).toBeCloseTo(epx);
  expect(apy).toBeCloseTo(epy);
  expect(apz).toBeCloseTo(epz);
  const [atx, aty, atz] = actual.target;
  const [etx, ety, etz] = expected.target;
  expect(atx).toBeCloseTo(etx);
  expect(aty).toBeCloseTo(ety);
  expect(atz).toBeCloseTo(etz);
  const [aux, auy, auz] = actual.up;
  const [eux, euy, euz] = expected.up;
  expect(aux).toBeCloseTo(eux);
  expect(auy).toBeCloseTo(euy);
  expect(auz).toBeCloseTo(euz);
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
    console.log(actual);
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
  it("is the inverse of applying a rotation matrix whenever -90° < Y < 90°", () => {});
});
