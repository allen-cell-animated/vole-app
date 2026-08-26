import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import PlayControls from "../playControls";

describe("PlayControls", () => {
  let controls: PlayControls;

  beforeEach(() => {
    controls = new PlayControls();
    controls.getVolumeIsLoaded = () => true;
    controls.stepAxis = () => {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("reschedules immediately when framerate changes during active playback", () => {
    // ARRANGE
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(window, "setTimeout");
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");

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
