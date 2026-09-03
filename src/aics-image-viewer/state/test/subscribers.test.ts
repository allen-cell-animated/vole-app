import type { View3d, Volume } from "@aics/vole-core";
import { describe, expect, it } from "@jest/globals";

import type { AxisName, XYZ } from "../../shared/types";
import { applyTripleSliceIndices } from "../subscribers";

const AXES: AxisName[] = ["x", "y", "z"];

/** A stand-in for a `Volume` whose currently loaded scale level has the given voxel dimensions. */
const volumeAtLevel = (volumeSize: XYZ<number>): Volume => ({ imageInfo: { volumeSize } }) as Volume;

/** Applies `slice` against a level of the given size and returns the indices handed to `view3d`. */
const indicesAtLevel = (volumeSize: XYZ<number>, slice: XYZ<number>): XYZ<number> => {
  const indices: Partial<XYZ<number>> = {};
  const view3d = {
    setTripleSliceIndex: (axis: AxisName, index: number) => {
      indices[axis] = index;
    },
  } as View3d;
  applyTripleSliceIndices(view3d, volumeAtLevel(volumeSize), slice);
  return indices as XYZ<number>;
};

/**
 * Scale levels are free to resize any subset of the axes by any factor. Nothing here may assume a
 * particular downsampling strategy, so every case below is exercised against the same expectations.
 */
const LEVELS: [string, XYZ<number>][] = [
  ["full resolution", { x: 1824, y: 1248, z: 42 }],
  ["x and y halved, z untouched", { x: 912, y: 624, z: 42 }],
  ["z halved, x and y untouched", { x: 1824, y: 1248, z: 21 }],
  ["all three halved", { x: 912, y: 624, z: 21 }],
  ["each axis by a different factor", { x: 456, y: 624, z: 14 }],
  ["only one axis downsampled", { x: 1824, y: 156, z: 42 }],
  ["anisotropic, non-power-of-two", { x: 609, y: 415, z: 13 }],
  ["an axis reduced to a single voxel", { x: 228, y: 156, z: 1 }],
];

const SLICES: XYZ<number>[] = [
  { x: 0.5, y: 0.5, z: 0.5 },
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 1, z: 1 },
  { x: 0.25, y: 0.75, z: 0.1 },
  { x: 0.99, y: 0.01, z: 0.5 },
];

describe("applyTripleSliceIndices", () => {
  it.each(LEVELS)("keeps every axis in range at a level with %s", (_name, volumeSize) => {
    for (const slice of SLICES) {
      const indices = indicesAtLevel(volumeSize, slice);
      for (const axis of AXES) {
        expect(indices[axis]).toBeGreaterThanOrEqual(0);
        expect(indices[axis]).toBeLessThanOrEqual(volumeSize[axis] - 1);
        expect(Number.isInteger(indices[axis])).toBe(true);
      }
    }
  });

  it.each(LEVELS)("preserves each axis's relative position at a level with %s", (_name, volumeSize) => {
    for (const slice of SLICES) {
      const indices = indicesAtLevel(volumeSize, slice);
      for (const axis of AXES) {
        // Within one voxel of the requested position - the most any resolution can resolve
        const requested = slice[axis] * volumeSize[axis];
        expect(Math.abs(indices[axis] - requested)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("re-derives indices for the new level rather than carrying over the old level's", () => {
    // Whichever axes a level resizes, the position each index names must survive the change. Carrying an
    // index over unchanged only stays correct on axes that kept their size.
    const slice = { x: 0.5, y: 0.25, z: 0.75 };
    for (const [, volumeSize] of LEVELS) {
      const indices = indicesAtLevel(volumeSize, slice);
      for (const axis of AXES) {
        const relative = volumeSize[axis] > 1 ? indices[axis] / volumeSize[axis] : slice[axis];
        expect(relative).toBeCloseTo(slice[axis], 1);
      }
    }
  });

  it("maps the levels from the reported bug to their midpoints", () => {
    // The "small colony" pyramid halves x and y per level but holds z at 42. Switching from the level a 2D
    // view loads to the one a triple view needs used to leave x and y clamped to the far edge (455, 311).
    expect(indicesAtLevel({ x: 1824, y: 1248, z: 42 }, { x: 0.5, y: 0.5, z: 0.5 })).toEqual({
      x: 912,
      y: 624,
      z: 21,
    });
    expect(indicesAtLevel({ x: 456, y: 312, z: 42 }, { x: 0.5, y: 0.5, z: 0.5 })).toEqual({
      x: 228,
      y: 156,
      z: 21,
    });
  });
});
