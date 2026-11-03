// import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, Quality } from "mediabunny";

import CanvasRecorder, { defaultRecordingOptions, type RecordingOptions } from "./CanvasRecorder";

// Eslint doesn't recognize the WebCodecs API yet.
// This line prevents eslint from throwing errors like
// 'VideoEncoder' is not defined (no-undef).
/* global VideoEncoder, VideoFrame, VideoEncoderConfig*/

export enum VideoBitrate {
  HIGH = 1e8, // 100 Mbps
  MEDIUM = 1e7, // 10 Mbps
  LOW = 5e6, // 5 Mbps
}

/**
 * Returns a promise that resolves after a set duration, in milliseconds.
 */
export async function sleep(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

/**
 * Records frames to an MP4 file using the WebCodecs API.
 */
export default class Mp4VideoRecorder extends CanvasRecorder {
  // private videoEncoder: VideoEncoder;
  private output: Output<Mp4OutputFormat, BufferTarget>;
  private videoSource: CanvasSource | undefined;

  constructor(
    setFrameAndRender: (frame: number) => Promise<void>,
    getCanvas: () => HTMLCanvasElement,
    options: Partial<RecordingOptions>
  ) {
    super(setFrameAndRender, getCanvas);
    this.options = { ...defaultRecordingOptions, ...options };
    this.output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });
    this.output.setMetadataTags({
      date: new Date(),
    });
  }

  protected async setup(): Promise<void> {
    const codec = await getFirstEncodableVideoCodec(["avc", "av1", "vp9"], {
      width: this.getCanvas().width,
      height: this.getCanvas().height,
      quality: new Quality({ bitrate: this.options.bitrate }),
    });
    if (!codec) {
      throw new Error("No encodable video codec found.");
    }

    this.videoSource = new CanvasSource(this.getCanvas(), {
      codec: codec,
      quality: new Quality({ bitrate: this.options.bitrate }),
      // Video compression works by recording changes from one frame to the next. Keyframes
      // have the full frame data saved, so adding them in ensures a smaller drop in frame
      // quality. See https://en.wikipedia.org/wiki/Key_frame for more details.
      // Add a keyframe every second. (1-2 seconds usually recommended)
      keyFrameInterval: 1,
    });

    this.output.addVideoTrack(this.videoSource, { frameRate: this.options.fps });
    await this.output.start();
  }

  protected async recordFrame(frame: number): Promise<void> {
    // Account for frame skipping
    const frameIndex = Math.floor((frame - this.options.min) / this.options.frameIncrement);
    const fps = this.options.fps;
    const timestampSeconds = frameIndex / fps;
    const durationSeconds = 1 / fps;

    if (!this.isRecording()) {
      return;
    }

    // Force a re-render just before recording to prevent blank frames.
    await this.setFrameAndRender(frame);
    // Add the frame to the video encoder
    if (!this.videoSource) {
      throw new Error("Video source is not initialized.");
    }
    await sleep(10);
    await this.videoSource.add(timestampSeconds, durationSeconds);
  }

  protected async onCompletedRecording(): Promise<void> {
    console.log("Completed recording.");
    console.log("MIME type:", await this.output.getMimeType());
    await this.output.finalize();
    const buffer = this.output.target.buffer;
    if (!buffer) {
      throw new Error("No video buffer found after finalizing the output.");
    }

    // Download the finished video file
    const videoBlob = new Blob([buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(videoBlob);
    this.download(this.options.prefix + ".mp4", url);
    URL.revokeObjectURL(url);
  }

  protected async cleanup(): Promise<void> {
    await super.cleanup();
    await this.output.cancel();
    if (this.videoSource) {
      this.videoSource.close();
    }
  }

  public static isSupported(): boolean {
    return true;
  }
}
