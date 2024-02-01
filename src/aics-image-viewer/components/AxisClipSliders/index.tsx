import React, { useCallback, useEffect, useState } from "react";
import { Button, Tooltip } from "antd";

import NumericInput from "../shared/NumericInput";
import SmarterSlider from "../shared/SmarterSlider";

import "./styles.css";

import { ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../App/types";
import { AxisName, PerAxis, activeAxisMap } from "../../shared/types";
import PlayControls from "../../shared/utils/PlayControls";

const AXES: AxisName[] = ["x", "y", "z"];

type SliderRowProps = {
  label: string;
  vals: number[];
  valsReadout?: number[];
  max: number;
  onSlide?: (values: number[]) => void;
  onChange?: (values: number[]) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

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

  return (
    <span className="axis-slider-container">
      <span className="slider-name">{label}</span>
      <span className="axis-slider">
        <SmarterSlider
          className={isRange ? "" : "slider-single-handle"}
          connect={true}
          range={{ min: 0, max }}
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
      <span className="slider-values">
        <NumericInput
          max={max}
          value={valsReadout[0]}
          onChange={(value) => onChange?.(isRange ? [value, vals[1]] : [value])}
        />
        {isRange && (
          <>
            {" , "}
            <NumericInput max={max} value={valsReadout[1]} onChange={(value) => onChange?.([vals[0], value])} />
          </>
        )}
        {" / "}
        {max}
      </span>
    </span>
  );
};

type PlaySliderRowProps = {
  label: string;
  val: number;
  max: number;
  playing: boolean;
  entireAxisLoaded?: boolean;
  onPlayPause: (play: boolean) => void;
  onChange?: (values: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

const PlaySliderRow: React.FC<PlaySliderRowProps> = (props) => {
  const [valReadout, setValReadout] = useState(props.val);

  const wrappedOnChange = useCallback(([val]: number[]) => props.onChange?.(val), [props.onChange]);
  const wrappedSetValReadout = useCallback(([val]: number[]) => setValReadout(val), []);
  return (
    <>
      <SliderRow
        label={props.label}
        vals={[props.val]}
        valsReadout={props.entireAxisLoaded ? [valReadout] : undefined}
        max={props.max}
        onSlide={props.entireAxisLoaded ? wrappedOnChange : wrappedSetValReadout}
        onChange={props.entireAxisLoaded ? undefined : wrappedOnChange}
        onStart={props.onStart}
        onEnd={props.onEnd}
      />
      <Tooltip placement="top" title="Play through sequence">
        <Button
          className="slider-play-button"
          onClick={() => props.onPlayPause(!props.playing)}
          icon={props.playing ? "pause" : "caret-right"}
        />
      </Tooltip>
    </>
  );
};

type AxisClipSlidersProps = {
  mode: ViewMode;
  changeViewerSetting: ViewerSettingUpdater;
  numSlices: PerAxis<number>;
  region: PerAxis<[number, number]>;
  slices: PerAxis<number>;
  numTimesteps: number;
  time: number;
  playingAxis: AxisName | "t" | null;
  playControls: PlayControls;
};

// interface AxisClipSlidersState {
//   playing: boolean;
//   intervalId: number;
//   // shadows `time` prop, but updates while time slider is moving (`time` does not to avoid reloads)
//   timeReadout: number;
// }

// export default class AxisClipSliders extends React.Component<AxisClipSlidersProps, AxisClipSlidersState> {
//   constructor(props: AxisClipSlidersProps) {
//     super(props);

//     this.state = {
//       playing: false,
//       intervalId: 0,
//       timeReadout: props.time,
//     };

//     this.play = this.play.bind(this);
//     this.pause = this.pause.bind(this);
//     this.moveSlice = this.moveSlice.bind(this);
//     this.createAxisSlider = this.createAxisSlider.bind(this);
//   }

//   componentDidUpdate(prevProps: AxisClipSlidersProps): void {
//     // Make extra sure the number next to the time slider is accurate
//     if (prevProps.time !== this.props.time) {
//       this.setState({ timeReadout: this.props.time });
//     }

//     // Pause if mode or fov has changed
//     const numSlicesChanged = AXES.reduce(
//       (hasChanged, axis) => hasChanged || prevProps.numSlices[axis] !== this.props.numSlices[axis],
//       false
//     );

//     if (numSlicesChanged || prevProps.mode !== this.props.mode) {
//       this.pause();
//     }
//   }

//   getActiveAxis = (): AxisName | null => activeAxisMap[this.props.mode];

//   /**
//    * Moves the single slice viewed on the active axis one step forwards or backwards.
//    * Wraps in both directions.
//    * @param backward boolean indicating move direction.
//    */
//   moveSlice(backward: boolean = false): void {
//     const activeAxis = this.getActiveAxis();
//     if (activeAxis === null) {
//       return;
//     }
//     const delta = backward ? -1 : 1;
//     const max = this.props.numSlices[activeAxis];
//     const currentLeftSliderValue = Math.round(this.props.slices[activeAxis] * max);
//     const leftValue = (currentLeftSliderValue + delta + max) % max;
//     this.updateSlice(activeAxis, leftValue);
//   }

//   play(): void {
//     if (this.getActiveAxis() && !this.state.playing) {
//       const intervalId = window.setInterval(this.moveSlice, PLAY_RATE_MS_PER_STEP);
//       this.setState({ playing: true, intervalId });
//     }
//   }

//   pause(): void {
//     window.clearInterval(this.state.intervalId);
//     if (this.state.playing) {
//       this.setState({ playing: false });
//     }
//   }

//   updateRegion(axis: AxisName, minval: number, maxval: number): void {
//     const { changeViewerSetting, numSlices, region } = this.props;
//     // get a value from 0-1
//     const max = numSlices[axis];
//     const start = minval / max;
//     const end = maxval / max;
//     changeViewerSetting("region", { ...region, [axis]: [start, end] });
//   }

//   updateSlice(axis: AxisName, val: number): void {
//     const { changeViewerSetting, numSlices, slices } = this.props;
//     changeViewerSetting("slice", { ...slices, [axis]: val / numSlices[axis] });
//   }

//   makeSliderCallback(axis: AxisName): (values: number[]) => void {
//     return (values: number[]) => {
//       if (values.length < 2) {
//         this.updateSlice(axis, values[0]);
//       } else {
//         this.updateRegion(axis, values[0], values[1]);
//       }
//     };
//   }

//   createAxisSlider(axis: AxisName, twoD: boolean): React.ReactNode {
//     const { playing } = this.state;
//     const numSlices = this.props.numSlices[axis];
//     const clipVals = this.props.region[axis];
//     const slice = this.props.slices[axis];
//     const sliderVals = twoD
//       ? [Math.round(slice * numSlices)]
//       : [Math.round(clipVals[0] * numSlices), Math.round(clipVals[1] * numSlices)];

//     return (
//       <div key={axis + numSlices} className={`slider-row slider-${axis}`}>
//         <SliderRow
//           // prevents slider from potentially not updating number of handles
//           key={`${twoD}`}
//           label={axis.toUpperCase()}
//           vals={sliderVals}
//           max={numSlices - (twoD && numSlices > 1 ? 1 : 0)}
//           onSlide={this.makeSliderCallback(axis)}
//         />
//         {twoD && (
//           <Tooltip placement="top" title="Play through sequence">
//             <Button
//               className="slider-play-button"
//               onClick={playing ? this.pause : this.play}
//               icon={playing ? "pause" : "caret-right"}
//             />
//           </Tooltip>
//         )}
//       </div>
//     );
//   }

//   createTimeSlider(): React.ReactNode {
//     const { time, numTimesteps, changeViewerSetting } = this.props;
//     const { timeReadout } = this.state;

//     return (
//       <div className="slider-row">
//         <SliderRow
//           label={""}
//           vals={[time]}
//           valsReadout={[timeReadout]}
//           max={numTimesteps}
//           onSlide={([time]) => this.setState({ timeReadout: time })}
//           onSet={([time]) => changeViewerSetting("time", time)}
//         />
//       </div>
//     );
//   }

//   render(): React.ReactNode {
//     const activeAxis = this.getActiveAxis();
//     return (
//       <div className={activeAxis ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
//         <span className="slider-group">
//           <h4 className="slider-group-title">ROI</h4>
//           <span className="slider-group-rows">
//             {activeAxis
//               ? this.createAxisSlider(activeAxis, true)
//               : AXES.map((axis) => this.createAxisSlider(axis, false))}
//           </span>
//         </span>

//         {this.props.numTimesteps > 1 && (
//           <span className="slider-group">
//             <h4 className="slider-group-title">Time</h4>
//             <span className="slider-group-rows">{this.createTimeSlider()}</span>
//           </span>
//         )}
//       </div>
//     );
//   }
// }

const AxisClipSliders: React.FC<AxisClipSlidersProps> = (props) => {
  // const [playingAxis, setPlayingAxis] = useState<AxisName | "t" | null>(null);

  // const playTimeoutIdRef = useRef<number>(0);
  // const playWaitingForLoadRef = useRef(false);
  // const handleHeldRef = useRef(false);

  const activeAxis = activeAxisMap[props.mode];

  const updateRegion = (axis: AxisName, minval: number, maxval: number): void => {
    if (!props.playControls.playHolding || props.playingAxis !== axis) {
      props.playControls.pause();
    }

    const { changeViewerSetting, numSlices, region } = props;
    // get a value from 0-1
    const max = numSlices[axis];
    const start = minval / max;
    const end = maxval / max;
    changeViewerSetting("region", { ...region, [axis]: [start, end] });
  };

  const updateSlice = (axis: AxisName, val: number): void => {
    if (!props.playControls.playHolding || props.playingAxis !== axis) {
      props.playControls.pause();
    }

    props.changeViewerSetting("slice", { ...props.slices, [axis]: val / props.numSlices[axis] });
  };

  // const pause = (willResume = false): void => {
  //   console.log("pause");
  //   window.clearTimeout(playTimeoutIdRef.current);
  //   playTimeoutIdRef.current = 0;
  //   playWaitingForLoadRef.current = false;
  //   if (playingAxis !== null && !willResume) {
  //     setPlayingAxis(null);
  //   }
  // };
  useEffect(() => props.playControls.pause(), [props.mode, ...Object.values(props.numSlices)]);

  // const playStep = (axis: AxisName | "t", lastVal?: number): void => {
  //   console.log(props.checkImageLoaded?.());
  //   if (!props.checkImageLoaded?.()) {
  //     playWaitingForLoadRef.current = true;
  //     return;
  //   }

  //   let current: number;
  //   if (axis === "t") {
  //     current = lastVal ?? props.time;
  //     props.changeViewerSetting("time", (current + 1) % props.numTimesteps);
  //   } else {
  //     const max = props.numSlices[axis];
  //     current = lastVal ?? props.slices[axis] * max;
  //     props.changeViewerSetting("slice", { ...props.slices, [axis]: ((current + 1) % max) / max });
  //   }

  //   playTimeoutIdRef.current = window.setTimeout(() => playStep(axis, current + 1), PLAY_RATE_MS_PER_STEP);
  // };

  // useEffect(() => {
  //   console.log("effect");
  //   if (props.imageLoaded && playWaitingForLoadRef.current) {
  //     playWaitingForLoadRef.current = false;
  //     if (playingAxis) {
  //       playStep(playingAxis);
  //     }
  //   }
  // }, [props.imageLoaded]);

  // const play = (axis: AxisName | "t"): void => {
  //   if (playingAxis !== null) {
  //     pause(true);
  //   }
  //   setPlayingAxis(axis);
  //   playStep(axis);
  // };

  const handlePlayPause = (axis: AxisName | "t", willPlay: boolean): void => {
    if (willPlay) {
      console.log("play from button click");
      props.playControls.play(axis);
    } else {
      props.playControls.pause();
    }
  };

  // const handleSlideStart = (axis: AxisName | "t"): void => {
  //   handleHeldRef.current = true;
  //   pause(axis !== playingAxis);
  // };

  // const handleSlideEnd = (): void => {
  //   handleHeldRef.current = false;
  //   if (playingAxis) {
  //     console.log("play from slide end");
  //     play(playingAxis);
  //   }
  // };

  const create2dAxisSlider = (axis: AxisName): React.ReactNode => (
    <div key={axis + props.numSlices[axis]} className={`slider-row slider-${axis}`}>
      <PlaySliderRow
        label={axis.toUpperCase()}
        val={Math.round(props.slices[axis] * props.numSlices[axis])}
        max={props.numSlices[axis] - 1}
        onChange={(val) => updateSlice(axis, val)}
        onStart={() => props.playControls.startHold(axis)}
        onEnd={() => props.playControls.endHold()}
        playing={props.playingAxis === axis}
        onPlayPause={(willPlay) => handlePlayPause(axis, willPlay)}
      />
    </div>
  );

  const create3dAxisSlider = (axis: AxisName): React.ReactNode => {
    const numSlices = props.numSlices[axis];
    const region = props.region[axis];

    return (
      <div key={axis + numSlices} className={`slider-row slider-${axis}`}>
        <SliderRow
          label={axis.toUpperCase()}
          vals={[Math.round(region[0] * numSlices), Math.round(region[1] * numSlices)]}
          max={numSlices - 1}
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
            <div className="slider-row">
              <PlaySliderRow
                label={""}
                val={props.time}
                max={props.numTimesteps}
                playing={props.playingAxis === "t"}
                onPlayPause={(willPlay) => handlePlayPause("t", willPlay)}
                onChange={(time) => props.changeViewerSetting("time", time)}
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
