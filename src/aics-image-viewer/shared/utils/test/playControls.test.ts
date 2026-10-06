import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PlayControls from "../playControls";

describe("PlayControls", () => {
  let controls: PlayControls;

  beforeEach(() => {
    controls = new PlayControls();
    controls.getVolumeIsLoaded = () => true;
    controls.stepAxis = () => {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reschedules immediately when framerate changes during active playback", () => {
    // ARRANGE
    vi.useFakeTimers();
    const timeoutSpy = vi.spyOn(window, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    controls.play("t");
    expect(timeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 125);
    const firstTimeoutId = controls.playTimeoutId;

    // ACT
    controls.setTargetFramerate(20);

    // ASSERT
    expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimeoutId);
    expect(timeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000 / 20);
  });
});
