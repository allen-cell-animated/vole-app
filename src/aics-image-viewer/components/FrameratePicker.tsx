import React, { type ReactElement, useEffect, useState } from "react";

import { isValidFramerate } from "../shared/framerate";
import { select, useViewerState } from "../state/store";
import NumericInput from "./shared/NumericInput";

export default function FrameratePicker(): ReactElement {
  const targetFramerate = useViewerState(select("targetFramerate"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  const onChange = (value: number) => {
    if (isValidFramerate(value)) {
      changeViewerSetting("targetFramerate", value);
    }
  };

  return (
    <>
      <label htmlFor="target-framerate-input">Playback frame rate (FPS)</label>
      <NumericInput
        className="target-framerate-input"
        min={0}
        step={2}
        precision={0.001}
        value={targetFramerate}
        onChange={onChange}
      />
    </>
  );
}
