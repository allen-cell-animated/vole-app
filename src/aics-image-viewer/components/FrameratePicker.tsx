import React, { type ReactElement, useEffect, useState } from "react";

import { isValidFramerate } from "../shared/framerate";
import { select, useViewerState } from "../state/store";

export default function FrameratePicker(): ReactElement {
  const targetFramerate = useViewerState(select("targetFramerate"));
  const targetFramerateText = String(targetFramerate);
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));
  const [displayedFramerate, setDisplayedFramerate] = useState(targetFramerateText);
  // Computing this is very fast: not worth memoizing
  const hasValidTargetFramerate = isValidFramerate(Number(displayedFramerate));

  // Update when ViewerState changes (e.g., user clicks "Clear all settings")
  useEffect(() => setDisplayedFramerate(targetFramerateText), [targetFramerateText]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = ({ target }) => {
    // displayedFramerate is a string to handle empty input
    setDisplayedFramerate(target.value);

    if (isValidFramerate(target.valueAsNumber)) {
      changeViewerSetting("targetFramerate", target.valueAsNumber);
    }
  };

  const onBlur = (): void => {
    if (!hasValidTargetFramerate) {
      // Replace the invalid user input with the last valid framerate
      setDisplayedFramerate(targetFramerateText);
    }
  };

  return (
    <>
      <label htmlFor="target-framerate-input">Playback frame rate (FPS)</label>
      <input
        id="target-framerate-input"
        className="target-framerate-input"
        type="number"
        min={0} // Setting min to a small positive fraction creates poor UX
        step="any"
        value={displayedFramerate}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={!hasValidTargetFramerate}
      />
    </>
  );
}
