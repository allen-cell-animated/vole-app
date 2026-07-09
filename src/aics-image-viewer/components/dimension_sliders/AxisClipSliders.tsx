import type { Volume } from "@aics/vole-core";
import React, { useEffect } from "react";

import type { ViewMode } from "../../shared/enums";
import { activeAxisMap, type AxisName, type PerAxis } from "../../shared/types";
import type PlayControls from "../../shared/utils/playControls";
import type { ViewerStateActions } from "../../state/store";

import { DimensionSliderRow, IndexSliderRow, PlaySliderRow } from "./SliderRows";

const AXES: AxisName[] = ["x", "y", "z"];

type AxisClipSlidersProps = {
  mode: ViewMode;
  image: Volume | null;
  changeViewerSetting: ViewerStateActions["changeViewerSetting"];
  numSlices: PerAxis<number>;
  numSlicesLoaded: PerAxis<number>;
  numScenes: number;
  region: PerAxis<[number, number]>;
  slices: PerAxis<number>;
  numTimesteps: number;
  time: number;
  scene: number;
  playingAxis: AxisName | "t" | null;
  playControls: PlayControls;
};

export const AxisClipSliders: React.FC<AxisClipSlidersProps> = (props) => {
  const activeAxis = activeAxisMap[props.mode];

  const pauseOnInput = (axis: AxisName | "t"): void => {
    // Pause on slider input unless user is scrubbing along the playing axis (playback is held while this is happening)
    if (!props.playControls.playHolding || props.playingAxis !== axis) {
      props.playControls.pause();
    }
  };

  const updateRegion = (axis: AxisName, minval: number, maxval: number): void => {
    pauseOnInput(axis);

    const { changeViewerSetting, numSlices } = props;
    // get a value from 0-1
    const max = numSlices[axis];
    const start = minval / max;
    const end = maxval / max;
    changeViewerSetting("region", { [axis]: [start, end] });
  };

  const updateSlice = (axis: AxisName, slice: number): void => {
    pauseOnInput(axis);
    props.changeViewerSetting("slice", { [axis]: slice / props.numSlices[axis] });
  };

  const updateTime = (time: number): void => {
    pauseOnInput("t");
    props.changeViewerSetting("time", time);
  };

  // Pause when view mode or volume size has changed
  useEffect(() => props.playControls.pause(), [props.mode, props.image, props.playControls]);

  const handlePlayPause = (axis: AxisName | "t", willPlay: boolean): void => {
    if (willPlay) {
      props.playControls.play(axis);
    } else {
      props.playControls.pause();
    }
  };

  const create2dAxisSlider = (axis: AxisName): React.ReactNode => {
    const numSlices = props.numSlices[axis];
    const numSlicesLoaded = props.numSlicesLoaded[axis];

    return (
      <div key={axis + numSlices + numSlicesLoaded} className={`slider-row slider-${axis}`}>
        <PlaySliderRow
          label={axis.toUpperCase()}
          val={Math.round(props.slices[axis] * numSlices)}
          max={numSlices}
          onChange={(val) => updateSlice(axis, val)}
          onStart={() => props.playControls.startHold(axis)}
          onEnd={() => props.playControls.endHold()}
          playing={props.playingAxis === axis}
          onTogglePlayback={(willPlay) => handlePlayPause(axis, willPlay)}
          updateWhileSliding={numSlices === numSlicesLoaded}
        />
      </div>
    );
  };

  const create3dAxisSlider = (axis: AxisName): React.ReactNode => {
    const numSlices = props.numSlices[axis];
    if (numSlices === 1) {
      return null;
    }
    const region = props.region[axis];

    return (
      <div key={axis + numSlices + "3d"} className={`slider-row slider-${axis}`}>
        <DimensionSliderRow
          label={axis.toUpperCase()}
          val={[Math.round(region[0] * numSlices), Math.round(region[1] * numSlices)]}
          min={0}
          max={numSlices}
          onSlide={(values) => updateRegion(axis, values[0], values[1])}
          onStart={() => props.playControls.startHold(axis)}
          onEnd={() => props.playControls.endHold()}
        />
      </div>
    );
  };

  return (
    <div className={activeAxis ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
      <span className="slider-group">
        <span className="slider-group-title">ROI</span>
        <span className="slider-group-rows">
          {activeAxis ? create2dAxisSlider(activeAxis) : AXES.map(create3dAxisSlider)}
        </span>
      </span>

      {props.numTimesteps > 1 && (
        <span className="slider-group">
          <span className="slider-group-title">Time</span>
          <span className="slider-group-rows">
            <div className="slider-row slider-t">
              <PlaySliderRow
                label={""}
                val={props.time}
                max={props.numTimesteps}
                playing={props.playingAxis === "t"}
                onTogglePlayback={(willPlay) => handlePlayPause("t", willPlay)}
                onChange={(time) => updateTime(time)}
                onStart={() => props.playControls.startHold("t")}
                onEnd={() => props.playControls.endHold()}
              />
            </div>
          </span>
        </span>
      )}

      {props.numScenes > 1 && (
        <span className="slider-group">
          <span className="slider-group-title">Scene</span>
          <span className="slider-group-rows">
            <div className="slider-row slider-scene">
              <IndexSliderRow
                label=""
                val={props.scene}
                max={props.numScenes}
                onChange={(scene) => {
                  props.changeViewerSetting("scene", scene);
                  props.changeViewerSetting("useExactScaleLevel", false);
                }}
              />
            </div>
          </span>
        </span>
      )}
    </div>
  );
};
