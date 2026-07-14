import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";
import React from "react";

import { useRefWithSetter } from "../../../shared/utils/hooks";

import "./styles.css";

interface NumericInputProps {
  value: number;
  step?: number;
  precision?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  unitSymbol?: string;
  onChange: (value: number) => void;
}

/**
 * Fully-controlled numeric input (value must be supplied from state in parent).
 * Changeable with arrow keys, typing values, or clickable arrows. Inspired by
 * ant's `InputNumber`, but conforms to our style and behavior expectations.
 */
const NumericInput: React.FC<NumericInputProps> = ({
  value,
  step = 1,
  precision = step,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  className = "",
  unitSymbol = "",
  onChange,
}) => {
  // While the input has focus, allow invalid input, just don't call `onChange` with it
  const [hasFocus, _setHasFocus] = React.useState(false);
  // State doesn't update before focus handler runs - keep a ref following focus state
  const [hasFocusRef, setHasFocus] = useRefWithSetter(_setHasFocus, hasFocus);

  // Hold the potentially invalid contents of the focused input here
  const [textContent, setTextContent] = React.useState("");

  const inputRef = React.useRef<HTMLInputElement>(null);

  const clamp = (newValue: number): number => Math.min(Math.max(newValue, min), max);
  const roundToPrecision = (newValue: number): number => clamp(Math.round(newValue / precision) * precision);
  const shouldChange = (newValue: number): boolean => !(isNaN(newValue) || newValue === value || disabled);

  const displayedValue = roundToPrecision(value);

  const onFocus = (): void => {
    if (!hasFocusRef.current) {
      // propagate current value to `textContent` on focus
      setTextContent(displayedValue.toString());
      setHasFocus(true);
    }
  };

  const changeByStep = (up: boolean): void => {
    const delta = up ? step : -step;
    const newValue = clamp(displayedValue + delta);

    if (shouldChange(newValue)) {
      onChange(newValue);
      setTextContent(newValue.toString());
      // let the focus handler know we've taken care of things, so it won't restore the previous value
      setHasFocus(true);
    }

    inputRef.current?.focus();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    const { key } = event;

    if (["Up", "ArrowUp", "Down", "ArrowDown"].includes(key)) {
      changeByStep(key === "Up" || key === "ArrowUp");
      event.preventDefault();
    } else if (key === "Enter") {
      inputRef.current?.blur();
    }
  };

  const handleTyping = (inputStr: string): void => {
    setTextContent(inputStr);

    // if the user clears all text, assume they mean 0 (or the extremum closest to it)
    // this is likely not completely general, but should be reasonable for any of our purposes
    const inputNum = inputStr === "" ? 0 : parseFloat(inputStr);
    const newValue = roundToPrecision(inputNum);

    if (shouldChange(newValue)) {
      onChange(newValue);
    }
  };

  const fullClassName = "numinput" + (disabled ? " numinput-disabled" : "") + (className && ` ${className}`);
  return (
    <div className={fullClassName} onKeyDown={onKeyDown}>
      <input
        value={hasFocus ? textContent : displayedValue + unitSymbol}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        className="numinput-input"
        autoComplete="off"
        role="spinbutton"
        aria-valuenow={displayedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        ref={inputRef}
        onChange={({ target }) => handleTyping(target.value)}
        onFocus={onFocus}
        onBlur={() => setHasFocus(false)}
      />
      <div className="numinput-controls">
        <div
          className="numinput-controls-button numinput-controls-button-up"
          role="button"
          aria-label="Increase Value"
          aria-disabled={disabled}
          onClick={() => changeByStep(true)}
        >
          <CaretUpOutlined className="numinput-controls-button-icon" />
        </div>
        <div
          className="numinput-controls-button numinput-controls-button-down"
          role="button"
          aria-label="Decrease Value"
          aria-disabled={disabled}
          onClick={() => changeByStep(false)}
        >
          <CaretDownOutlined className="numinput-controls-button-icon" />
        </div>
      </div>
    </div>
  );
};

export default NumericInput;
