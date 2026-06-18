import type { View3d, Volume } from "@aics/vole-core";
import { CaretRightOutlined, PauseOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";

import type { ViewMode } from "../../shared/enums";
import { activeAxisMap, type AxisName, type PerAxis } from "../../shared/types";
import {
  applyMatrix,
  defaultOrientedCamera,
  getRotationAngles,
  rotationMatrix,
  useCameraCallback,
} from "../../shared/utils/camera";
import type PlayControls from "../../shared/utils/playControls";
import { select, useViewerState, type ViewerStateActions } from "../../state/store";

import NumericInput from "../shared/NumericInput";
import SmarterSlider from "../shared/SmarterSlider";

import "./styles.css";

const AXES: AxisName[] = ["x", "y", "z"];

type SliderRowProps<Value = number[]> = {
  label: string;
  vals: Value;
  valsReadout?: Value;
  min: number;
  max: number;
  hideMax?: boolean;
  unitSymbol?: string;
  // These event handlers attach to the events of the same names provided by noUiSlider.
  // Their behavior is documented at https://refreshless.com/nouislider/events-callbacks/
  onSlide?: (values: Value) => void;
  /** `onChange` is called on the corresponding noUiSlider event AND on interaction with a spinbox. */
  onChange?: (values: Value) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

/** A single slider row, with a slider, one or two spinbox inputs, and a max value */
const SliderRow: React.FC<SliderRowProps> = ({
  label,
  vals,
  valsReadout = vals,
  min,
  max,
  hideMax,
  unitSymbol,
  onSlide,
  onChange = onSlide,
  onStart,
  onEnd,
}) => (
  <span className="axis-slider-container">
    <span className="slider-name">{label}</span>
    {max <= min ? (
      <i>No values to adjust</i>
    ) : (
      <span className="axis-slider">
        <SmarterSlider
          className={vals.length <= 1 ? "slider-single-handle" : ""}
          connect={true}
          range={{ min, max }}
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
    {max > min && (
      <span className="slider-values">
        <NumericInput
          min={min}
          max={max}
          value={valsReadout[0]}
          onChange={(value) => onChange?.([value, ...vals.slice(1)])}
          unitSymbol={unitSymbol}
        />
        {vals.length > 1 && (
          <>
            {" , "}
            <NumericInput
              min={min}
              max={max}
              value={valsReadout[1]}
              onChange={(value) => onChange?.([vals[0], value])}
              unitSymbol={unitSymbol}
            />
          </>
        )}
        {!hideMax && (
          <>
            {" / "}
            {max}
          </>
        )}
      </span>
    )}
  </span>
);

/** A single slider row, with a slider, one or two spinbox inputs, and a max value */
const IndexSliderRow: React.FC<Omit<SliderRowProps<number>, "min" | "unitSymbol">> = (props) => (
  <SliderRow
    label={props.label}
    vals={[props.vals + 1]}
    valsReadout={props.valsReadout === undefined ? undefined : [props.valsReadout + 1]}
    min={1}
    max={props.max}
    onSlide={([value]) => props.onSlide?.(value - 1)}
    onChange={([value]) => props.onChange?.(value - 1)}
    onStart={props.onStart}
    onEnd={props.onEnd}
  />
);

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
  onChange?: (value: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

/** Wrapper around `SliderRow` that adds a play button and accounts for the case where not all of an axis is loaded */
const PlaySliderRow: React.FC<PlaySliderRowProps> = (props) => {
  const { onChange, onStart, onEnd } = props;
  // In partially-loaded axes, stores the displayed value of the slider while the user is sliding it
  const [valReadout, setValReadout] = useState(props.val);
  // Tracks when the user is sliding the slider and `valReadout` may have to sub in for props
  const [sliderHeld, setSliderHeld] = useState(false);

  const wrappedOnChange = useCallback((val: number) => onChange?.(val), [onChange]);
  const wrappedSetValReadout = useCallback((val: number) => setValReadout(val), []);
  const wrappedOnStart = useCallback((): void => {
    setValReadout(props.val);
    setSliderHeld(true);
    onStart?.();
  }, [onStart, props.val]);
  const wrappedOnEnd = useCallback((): void => {
    setSliderHeld(false);
    onEnd?.();
  }, [onEnd]);

  return (
    <>
      <IndexSliderRow
        label={props.label}
        vals={props.val}
        valsReadout={props.updateWhileSliding || !sliderHeld ? undefined : valReadout}
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
        <SliderRow
          label={axis.toUpperCase()}
          vals={[Math.round(region[0] * numSlices), Math.round(region[1] * numSlices)]}
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

      {props.numScenes > 1 && (
        <span className="slider-group">
          <h4 className="slider-group-title">Scene</h4>
          <span className="slider-group-rows">
            <div className="slider-row slider-scene">
              <IndexSliderRow
                label=""
                vals={props.scene}
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

/** Convert an angle from degrees to radians */
const toRadians = (deg: number): number => deg * (Math.PI / 180);
/** Convert an angle from radians to degrees */
const toDegrees = (rad: number): number => rad * (180 / Math.PI);

export const RotationSliders: React.FC<{ view3d: View3d; disable: boolean }> = ({ view3d, disable }) => {
  const [rotation, setRotation] = useState(() => getRotationAngles(view3d.getCameraState()));
  const autorotate = useViewerState(select("autorotate"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  // Set to `true` when user interacts with this component, `false` when they click on the canvas or start autorotate.
  // While `hasControlRef.current === true`, this component's state propagates *down* to `view3d`
  // While `hasControlRef.current === false`, `view3d`'s camera state is synced *up* to this component.
  // TODO are there any other events besides the above that cause the volume to rotate? Ideally this would be an event
  //   that `View3d` would let us track directly.
  const hasControlRef = useRef(false);

  const handleRotate = useCallback(
    (axis: "x" | "y" | "z", deg: number) => {
      hasControlRef.current = true;
      if (autorotate) {
        changeViewerSetting("autorotate", false);
      }
      setRotation((current) => ({ ...current, [axis]: toRadians(deg) }));
    },
    [autorotate, changeViewerSetting]
  );

  const handleJump = useCallback((x: number, y: number, z: number) => {
    hasControlRef.current = true;
    setRotation({ x, y, z });
  }, []);

  // Take away control when autorotate is enabled
  useEffect(() => {
    if (autorotate) {
      hasControlRef.current = false;
    }
  }, [autorotate]);

  const rotateCameraTo = useCameraCallback((state, rotation: { x: number; y: number; z: number }) => {
    const matrix = rotationMatrix(rotation.x, rotation.y, rotation.z);
    return applyMatrix(defaultOrientedCamera(state), matrix);
  }, view3d);

  // Sync down rotation state while this component is "in control."
  useEffect(() => {
    if (hasControlRef.current) {
      rotateCameraTo(rotation);
    }
  }, [rotateCameraTo, rotation]);

  // Set up event listeners on mount.
  useEffect(() => {
    // TODO this is *extremely brittle*: setting this clears away any other listener for render events.
    //   At time of writing, `setOnRenderCallback` appears not to be used anywhere else in either this package or
    //   vole-core, but that could change at any time.
    //   Ideally `View3d` would have an `addEventListener`/`removeEventListener` model.
    view3d.setOnRenderCallback(() => {
      if (!hasControlRef.current) {
        setRotation(getRotationAngles(view3d.getCameraState()));
      }
    });

    const clickListener = (): boolean => (hasControlRef.current = false);
    view3d.getDOMElement().addEventListener("mousedown", clickListener);
    return () => view3d.getDOMElement().removeEventListener("mousedown", clickListener);
  }, [view3d]);

  const createRotateSlider = (axis: AxisName): React.ReactNode => (
    <div key={`${axis}-rotate`} className={`slider-row slider-${axis}`}>
      <SliderRow
        label={axis.toUpperCase()}
        vals={[toDegrees(rotation[axis])]}
        min={-180}
        max={180}
        hideMax={true}
        onSlide={([deg]) => handleRotate(axis, deg)}
        unitSymbol="°"
      />
    </div>
  );

  const jumpXMinus = useCallback(() => handleJump(0, -Math.PI / 2, 0), [handleJump]);
  const jumpXPlus = useCallback(() => handleJump(0, Math.PI / 2, 0), [handleJump]);
  const jumpYMinus = useCallback(() => handleJump(Math.PI / 2, 0, -Math.PI / 2), [handleJump]);
  const jumpYPlus = useCallback(() => handleJump(-Math.PI / 2, 0, -Math.PI / 2), [handleJump]);
  const jumpZMinus = useCallback(() => handleJump(Math.PI, 0, -Math.PI), [handleJump]);
  const jumpZPlus = useCallback(() => handleJump(0, 0, 0), [handleJump]);

  return (
    <div className="clip-sliders clip-sliders-2d">
      <span className="slider-group">
        <h4 className="slider-group-title">Rotate</h4>
        {disable ? (
          <span className="axis-slider-container">
            <i>Unavailable in 2d mode</i>
          </span>
        ) : (
          <span className="slider-group-rows">
            {createRotateSlider("x")}
            {createRotateSlider("y")}
            {createRotateSlider("z")}
          </span>
        )}
      </span>
      {!disable && (
        <span className="slider-group">
          <h4 className="slider-group-title group-title-extra">Jump to</h4>
          <span className="slider-group-rows">
            <Button.Group>
              <Button onClick={jumpXMinus}>-X</Button>
              <Button onClick={jumpXPlus}>+X</Button>
              <Button onClick={jumpYMinus}>-Y</Button>
              <Button onClick={jumpYPlus}>+Y</Button>
              <Button onClick={jumpZMinus}>-Z</Button>
              <Button onClick={jumpZPlus}>+Z</Button>
            </Button.Group>
          </span>
        </span>
      )}
    </div>
  );
};
