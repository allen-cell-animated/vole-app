import { CaretRightOutlined, PauseOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import React, { useCallback, useState } from "react";

import NumericInput from "../shared/NumericInput";
import SmarterSlider from "../shared/SmarterSlider";

import "./styles.css";

type SharedSliderRowProps<Value = number> = {
  label: string;
  val: Value;
  valReadout?: Value;
  min: number;
  max: number;
  // These event handlers attach to the events of the same names provided by noUiSlider.
  // Their behavior is documented at https://refreshless.com/nouislider/events-callbacks/
  onSlide?: (value: Value) => void;
  /** `onChange` is called on the corresponding noUiSlider event AND on interaction with a spinbox. */
  onChange?: (value: Value) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

type DimensionSliderRowProps = SharedSliderRowProps<number[]> & {
  hideMax?: boolean;
  unitSymbol?: string;
};

type IndexSliderRowProps = Omit<SharedSliderRowProps, "min">;

type PlaySliderRowProps = Omit<SharedSliderRowProps, "valReadout" | "min" | "onSlide"> & {
  playing: boolean;
  updateWhileSliding?: boolean;
  onTogglePlayback: (play: boolean) => void;
};

/** A single slider row, with a slider, one or two spinbox inputs, and a max value. */
export const DimensionSliderRow: React.FC<DimensionSliderRowProps> = ({
  label,
  val,
  valReadout = val,
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
          className={val.length <= 1 ? "slider-single-handle" : ""}
          connect={true}
          range={{ min, max }}
          start={val}
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
          value={valReadout[0]}
          onChange={(value) => onChange?.([value, ...val.slice(1)])}
          unitSymbol={unitSymbol}
        />
        {val.length > 1 && (
          <>
            {" , "}
            <NumericInput
              min={min}
              max={max}
              value={valReadout[1]}
              onChange={(value) => onChange?.([val[0], value, ...val.slice(2)])}
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

/** Extremely thin wrapper around `SliderRow` for adjusting 0-indexed values that the user should see as 1-indexed. */
export const IndexSliderRow: React.FC<IndexSliderRowProps> = (props) => (
  <DimensionSliderRow
    label={props.label}
    val={[props.val + 1]}
    valReadout={props.valReadout === undefined ? undefined : [props.valReadout + 1]}
    min={1}
    max={props.max}
    onSlide={([value]) => props.onSlide?.(value - 1)}
    onChange={([value]) => props.onChange?.(value - 1)}
    onStart={props.onStart}
    onEnd={props.onEnd}
  />
);

/** Wrapper around `SliderRow` that adds a play button and accounts for the case where not all of an axis is loaded. */
export const PlaySliderRow: React.FC<PlaySliderRowProps> = (props) => {
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
        val={props.val}
        valReadout={props.updateWhileSliding || !sliderHeld ? undefined : valReadout}
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
