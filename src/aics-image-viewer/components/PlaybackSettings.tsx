import React, { type ReactElement, } from "react";
import FrameratePicker from "./FrameratePicker";

export default function PlaybackSettings(): ReactElement {
  return (
    <div className="playback-settings">
      <FrameratePicker />
    </div>
  );
}
