import type { CameraState } from "@aics/vole-core";
import { describe, expect, it } from "@jest/globals";

import { defaultOrientedCamera } from "../camera";

describe("applyMatrix", () => {});

describe("defaultOrientedCamera", () => {
  const testDefaultOrientedCamera = (
    input: CameraState,
    position: [number, number, number],
    target: [number, number, number]
  ): void => {
    const result = defaultOrientedCamera(input);
    const [px, py, pz] = result.position;
    const [tpx, tpy, tpz] = position;
    expect(px).toBeCloseTo(tpx);
    expect(py).toBeCloseTo(tpy);
    expect(pz).toBeCloseTo(tpz);
    const [tx, ty, tz] = result.target;
    const [ttx, tty, ttz] = target;
    expect(tx).toBeCloseTo(ttx);
    expect(ty).toBeCloseTo(tty);
    expect(tz).toBeCloseTo(ttz);
    const [ux, uy, uz] = result.up;
    expect(ux).toBeCloseTo(0);
    expect(uy).toBeCloseTo(1);
    expect(uz).toBeCloseTo(0);
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

describe("getRotationAngles", () => {});
