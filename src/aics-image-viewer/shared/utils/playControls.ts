import type { AxisName } from "../types";
import { TARGET_FRAMERATE_DEFAULT } from "../constants";

type PlayAxisName = AxisName | "t";

export default class PlayControls {
  playingAxis: PlayAxisName | null = null;
  playWaitingForLoad = false;
  playHolding = false;
  playTimeoutId = 0;
  private targetFramerate = TARGET_FRAMERATE_DEFAULT;
  private lastStepTime = 0;

  public getVolumeIsLoaded?: () => boolean;
  public stepAxis?: (axis: PlayAxisName) => void;
  public onPlayingAxisChanged?: (axis: PlayAxisName | null) => void;

  private setPlayingAxis(axis: PlayAxisName | null): void {
    this.playingAxis = axis;
    this.onPlayingAxisChanged?.(axis);
  }

  public setTargetFramerate(framerate: number): void {
    this.targetFramerate = framerate;

    // If playback is currently active and already scheduled, reschedule immediately so
    // the new framerate applies to the very next playback tick.
    if (this.playingAxis !== null && this.playTimeoutId !== 0) {
      window.clearTimeout(this.playTimeoutId);
      this.playTimeoutId = 0;
      this.playStep();
    }
  }

  private playStep(): void {
    if (!this.playingAxis || this.playHolding || !this.stepAxis) {
      return;
    }
    if (!this.getVolumeIsLoaded?.()) {
      this.playWaitingForLoad = true;
      return;
    }

    // Enforce minimum interval between frame *presentations* (not requests).
    // lastStepTime is set in onImageLoaded when a frame's data arrives.
    const playStepIntervalMs = 1000 / this.targetFramerate;
    const delay = playStepIntervalMs - (performance.now() - this.lastStepTime);
    if (delay > 0) {
      this.playTimeoutId = window.setTimeout(this.playStep.bind(this), delay);
      return;
    }

    this.stepAxis(this.playingAxis);
    this.playTimeoutId = window.setTimeout(this.playStep.bind(this), playStepIntervalMs);
  }

  /** Call whenever new data is loaded to resume playback if it was paused for data loading. */
  onImageLoaded(): void {
    // Record when the frame was presented, so scheduleNextStep enforces
    // a minimum interval between presentations (not between requests).
    this.lastStepTime = performance.now();
    if (this.playWaitingForLoad) {
      this.playWaitingForLoad = false;
      this.playStep();
    }
  }

  /**
   * Pause playback on the currently playing axis.
   * `willResume` marks this as a temporary suspension, e.g. while the user is scrubbing along the playing axis.
   */
  pause(willResume: boolean = false): void {
    window.clearTimeout(this.playTimeoutId);
    this.playTimeoutId = 0;
    this.playWaitingForLoad = false;
    if (this.playingAxis !== null && !willResume) {
      this.playHolding = false;
      this.setPlayingAxis(null);
    }
  }

  /** Begin playback on `axis`. */
  play(axis: PlayAxisName): void {
    if (this.playingAxis !== null) {
      this.pause(true);
    }
    this.setPlayingAxis(axis);
    this.playStep();
  }

  /** If `axis` is currently playing, begin a temporary hold on playback while other input is pending. */
  startHold(axis: PlayAxisName): void {
    this.playHolding = true;
    this.pause(axis === this.playingAxis);
  }

  /** If a playback hold is active, end it. */
  endHold(): void {
    if (this.playHolding) {
      this.playHolding = false;
      this.playStep();
    }
  }
}
