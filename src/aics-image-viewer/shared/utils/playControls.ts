import type { AxisName } from "../types";

type PlayAxisName = AxisName | "t";

const PLAY_STEP_INTERVAL_MS = 125;

export default class PlayControls {
  playingAxis: PlayAxisName | null = null;
  playWaitingForLoad = false;
  playHolding = false;
  playTimeoutId = 0;

  public getVolumeIsLoaded?: () => boolean;
  public stepAxis?: (axis: PlayAxisName) => void;
  public onPlayingAxisChanged?: (axis: PlayAxisName | null) => void;

  private setPlayingAxis(axis: PlayAxisName | null): void {
    this.playingAxis = axis;
    this.onPlayingAxisChanged?.(axis);
  }

  private playStep(): void {
    if (!this.playingAxis || this.playHolding || !this.stepAxis) {
      return;
    }
    // If the volume is not loaded, wait for it to load before continuing
    if (!this.getVolumeIsLoaded?.()) {
      this.playWaitingForLoad = true;
      return;
    }

    this.stepAxis(this.playingAxis);
    this.playTimeoutId = window.setTimeout(this.playStep.bind(this), PLAY_STEP_INTERVAL_MS);
  }

  /** Call whenever new data is loaded to resume playback if it was paused for data loading. */
  onImageLoaded(): void {
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
