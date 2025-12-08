import type { ControlPoint } from "@aics/vole-core";
import { describe, expect, it } from "@jest/globals";
import { isEqual } from "lodash";

describe("isEqual", () => {
  it("can determine equality for control points", () => {
    const getObject = (): ControlPoint[] => {
      return [
        { x: 1, opacity: 1, color: [255, 255, 255] },
        { x: 2, opacity: 1, color: [128, 128, 255] },
        { x: 3, opacity: 0.5, color: [0, 255, 0] },
      ];
    };
    const a = getObject();
    let b = getObject();
    expect(isEqual(a, b)).toBe(true);

    b = [
      { x: 1, opacity: 1, color: [255, 255, 255] },
      { x: 50, opacity: 4.7, color: [128, 128, 255] },
      { x: 128, opacity: 0.5, color: [0, 255, 1] },
    ];
    expect(isEqual(a, b)).toBe(false);

    const c = getObject();
    c[2].color = [0, 255, 1];
    expect(isEqual(a, c)).toBe(false);
  });
});
