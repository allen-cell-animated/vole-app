import { Volume } from "@aics/vole-core";
import { CaretRightOutlined, PauseOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React, { useCallback, useEffect, useState } from "react";

import { ViewMode } from "../../shared/enums";
import { activeAxisMap, AxisName, PerAxis } from "../../shared/types";
import PlayControls from "../../shared/utils/playControls";
import { ViewerSettingUpdater } from "../ViewerStateProvider/types";

import NumericInput from "../shared/NumericInput";
import SmarterSlider from "../shared/SmarterSlider";

import "./styles.css";

const AXES: AxisName[] = ["x", "y", "z"];

type SliderRowProps = {
  label: string;
  vals: number[];
  valsReadout?: number[];
  max: number;
  // These event handlers attach to the events of the same names provided by noUiSlider.
  // Their behavior is documented at https://refreshless.com/nouislider/events-callbacks/
  onSlide?: (values: number[]) => void;
  /** `onChange` is called on the corresponding noUiSlider event AND on interaction with a spinbox. */
  onChange?: (values: number[]) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

/** A single slider row, with a slider, one or two spinbox inputs, and a max value */
const SliderRow: React.FC<SliderRowProps> = ({
  label,
  vals,
  valsReadout = vals,
  max,
  onSlide,
  onChange = onSlide,
  onStart,
  onEnd,
}) => {
  const isRange = vals.length > 1;
  // If slider is a range, handles represent slice *edges*: the range around only the max slice is [max-1, max], e.g.
  // If slider is not a range, handle represents 0-indexed slices: last slice is at max-1
  const inputMax = isRange ? max : max - 1;

  return (
    <span className="axis-slider-container">
      <span className="slider-name">{label}</span>
      {inputMax === 0 ? (
        <i>No values to adjust</i>
      ) : (
        <span className="axis-slider">
          <SmarterSlider
            className={isRange ? "" : "slider-single-handle"}
            connect={true}
            range={{ min: 0, max: inputMax }}
            start={vals}
            step={1}
            margin={1}
            behaviour="drag"
            pips={{
              mode: "positions",
              values: [25, 50, 75],
              density: 25,
              format: {
                // remove labels from pips
                to: () => "",
              },
            }}
            // round slider output to nearest slice; assume any string inputs represent ints
            format={{ to: Math.round, from: parseInt }}
            onSlide={onSlide}
            onChange={onChange}
            onStart={onStart}
            onEnd={onEnd}
          />
        </span>
      )}
      {inputMax > 0 && (
        <span className="slider-values">
          <NumericInput
            max={inputMax}
            value={valsReadout[0]}
            onChange={(value) => onChange?.(isRange ? [value, vals[1]] : [value])}
          />
          {isRange && (
            <>
              {" , "}
              <NumericInput max={inputMax} value={valsReadout[1]} onChange={(value) => onChange?.([vals[0], value])} />
            </>
          )}
          {" / "}
          {max - 1}
        </span>
      )}
    </span>
  );
};

type PlaySliderRowProps = {
  label: string;
  val: number;
  max: number;
  playing: boolean;
  updateWhileSliding?: boolean;
  onTogglePlayback: (play: boolean) => void;
  // These event handlers attach to the events of the same names provided by noUiSlider.
  // Their behavior is documented at https://refreshless.com/nouislider/events-callbacks/
  /**
   * `onChange`'s behavior depends on `updateWhileSliding`: if true, it's called on slide and on release;
   * if false, it's called only on slide.
   */
  onChange?: (values: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

/** Wrapper around `SliderRow` that adds a play button and accounts for the case where not all of an axis is loaded */
const PlaySliderRow: React.FC<PlaySliderRowProps> = (props) => {
  // In partially-loaded axes, stores the displayed value of the slider while the user is sliding it
  const [valReadout, setValReadout] = useState(props.val);
  // Tracks when the user is sliding the slider and `valReadout` may have to sub in for props
  const [sliderHeld, setSliderHeld] = useState(false);

  const wrappedOnChange = useCallback(([val]: number[]) => props.onChange?.(val), [props.onChange]);
  const wrappedSetValReadout = useCallback(([val]: number[]) => setValReadout(val), []);
  const wrappedOnStart = useCallback((): void => {
    setValReadout(props.val);
    setSliderHeld(true);
    props.onStart?.();
  }, [props.onStart]);
  const wrappedOnEnd = useCallback((): void => {
    setSliderHeld(false);
    props.onEnd?.();
  }, [props.onEnd]);

  return (
    <>
      <SliderRow
        label={props.label}
        vals={[props.val]}
        valsReadout={props.updateWhileSliding || !sliderHeld ? undefined : [valReadout]}
        max={props.max}
        onSlide={props.updateWhileSliding ? wrappedOnChange : wrappedSetValReadout}
        onChange={props.updateWhileSliding ? undefined : wrappedOnChange}
        onStart={wrappedOnStart}
        onEnd={wrappedOnEnd}
      />
      {props.max > 1 && (
        <Tooltip placement="top" title="Play through sequence" trigger={["hover", "focus"]}>
          <Button
            className="slider-play-button"
            onClick={() => props.onTogglePlayback(!props.playing)}
            icon={props.playing ? <PauseOutlined /> : <CaretRightOutlined />}
            aria-label={(props.playing ? "Pause " : "Play ") + props.label}
          />
        </Tooltip>
      )}
    </>
  );
};

type AxisClipSlidersProps = {
  mode: ViewMode;
  image: Volume | null;
  changeViewerSetting: ViewerSettingUpdater;
  numSlices: PerAxis<number>;
  numSlicesLoaded: PerAxis<number>;
  region: PerAxis<[number, number]>;
  slices: PerAxis<number>;
  numTimesteps: number;
  time: number;
  playingAxis: AxisName | "t" | null;
  playControls: PlayControls;
};

const AxisClipSliders: React.FC<AxisClipSlidersProps> = (props) => {
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
  useEffect(() => props.playControls.pause(), [props.mode, props.image]);

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
        <SliderRow
          label={axis.toUpperCase()}
          vals={[Math.round(region[0] * numSlices), Math.round(region[1] * numSlices)]}
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
        <h4 className="slider-group-title">ROI</h4>
        <span className="slider-group-rows">
          {activeAxis ? create2dAxisSlider(activeAxis) : AXES.map(create3dAxisSlider)}
        </span>
      </span>

      {props.numTimesteps > 1 && (
        <span className="slider-group">
          <h4 className="slider-group-title">Time</h4>
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
    </div>
  );
};

export default AxisClipSliders;
