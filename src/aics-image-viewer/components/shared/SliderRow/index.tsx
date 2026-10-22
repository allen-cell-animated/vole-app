import type { Formatter, NouisliderProps } from "nouislider-react";
import React from "react";

import SmarterSlider from "../SmarterSlider";

import "./styles.css";

/**
 * Nouislider's event handler type has args `(values: any[], handle: number, unencodedValues: number[], ...)`.
 * The first argument, `values`, is the slider value *after it has been formatted for display*. It may have any type:
 * `number`, `string`, something more exotic.
 *
 * For type safety, `SliderRow` wraps handlers so they only get access to `unencodedValues`.
 */
type NouiCallback = NonNullable<NouisliderProps["onUpdate"]>;
type SliderRowCallback = (values: number[]) => void;

type SliderRowProps = {
  label: React.ReactNode;
  start?: number | number[];
  step?: number;
  formatInteger?: boolean;
  min?: number;
  max?: number;
  hideSlider?: boolean;
  disabled?: boolean;
  onSlide?: SliderRowCallback;
  onUpdate?: SliderRowCallback;
  onChange?: SliderRowCallback;

  children?: React.ReactNode;
};

const INTEGER_FORMATTER: Formatter = { to: Math.round, from: Number };

/** A component to ensure a single unified style across the many labeled slider rows in the control panel */
const SliderRow: React.FC<SliderRowProps> = (props) => {
  const { onSlide, onUpdate, onChange } = props;
  const wrappedOnSlide = React.useCallback<NouiCallback>((_v, _h, vals) => onSlide?.(vals), [onSlide]);
  const wrappedOnUpdate = React.useCallback<NouiCallback>((_v, _h, vals) => onUpdate?.(vals), [onUpdate]);
  const wrappedOnChange = React.useCallback<NouiCallback>((_v, _h, vals) => onChange?.(vals), [onChange]);

  return (
    <div className="viewer-control-row">
      <div className="control-name">{props.label}</div>
      <div className="control">
        {props.start !== undefined && !props.hideSlider && (
          <div className="control-slider">
            <SmarterSlider
              range={{ min: props.min ?? 0, max: props.max }}
              start={props.start}
              disabled={props.disabled}
              connect={true}
              tooltips={true}
              behaviour="drag"
              format={props.formatInteger ? INTEGER_FORMATTER : undefined}
              onSlide={wrappedOnSlide}
              onUpdate={wrappedOnUpdate}
              onChange={wrappedOnChange}
            />
          </div>
        )}
        {props.children && <div className="control-extra">{props.children}</div>}
      </div>
    </div>
  );
};

export default SliderRow;
