import type { NouisliderProps } from "nouislider-react";
import React from "react";

import SmarterSlider from "../SmarterSlider";

import "./styles.css";

type SliderRowProps = {
  label: React.ReactNode;
  start?: number | number[];
  step?: number;
  formatInteger?: boolean;
  min?: number;
  max?: number;
  onUpdate?: NouisliderProps["onUpdate"];
  onChange?: NouisliderProps["onChange"];
  hideSlider?: boolean;

  children?: React.ReactNode;
};

const INTEGER_FORMATTER = { to: Math.round, from: Number };

/** A component to ensure a single unified style across the many labeled slider rows in the control panel */
const SliderRow: React.FC<SliderRowProps> = (props) => (
  <div className="viewer-control-row">
    <div className="control-name">{props.label}</div>
    <div className="control">
      {props.start !== undefined && !props.hideSlider && (
        <div className="control-slider">
          <SmarterSlider
            range={{ min: props.min ?? 0, max: props.max }}
            start={props.start}
            connect={true}
            tooltips={true}
            behaviour="drag"
            format={props.formatInteger ? INTEGER_FORMATTER : undefined}
            onUpdate={props.onUpdate}
            onChange={props.onChange}
          />
        </div>
      )}
      {props.children && <div className="control-extra">{props.children}</div>}
    </div>
  </div>
);

export default SliderRow;
