import React from "react";

import ColorPicker, { type ColorPickerProps } from "../../ColorPicker";

import "./styles.css";

type ColorPickerPropPassthru = Partial<Pick<ColorPickerProps, "color" | "onColorChange" | "onColorChangeComplete">>;

export type ControlPanelRowProps = React.PropsWithChildren<
  ColorPickerPropPassthru & {
    verticalMargin?: number;
    showColorPicker?: boolean;
    title?: React.ReactNode;
    onClick?: React.MouseEventHandler;
    className?: string;
  }
>;

const defaultProps = {
  verticalMargin: 22,
  showColorPicker: true,
  color: { r: 255, g: 255, b: 255 },
} satisfies Partial<ControlPanelRowProps>;

const ControlPanelRow: React.FC<ControlPanelRowProps> = (inputProps) => {
  const props = { ...defaultProps, ...inputProps };
  const { color, onColorChange, onColorChangeComplete } = props;
  const colorPickerProps = { color, onColorChange, onColorChangeComplete };

  const style = {
    "--control-panel-row-vertical-margin": props.verticalMargin + "px",
  } as React.CSSProperties;

  const createTitle = props.title !== undefined || props.showColorPicker;
  const className = props.className ? `control-panel-row ${props.className}` : "control-panel-row";

  return (
    <div className={className} style={style} onClick={props.onClick}>
      {createTitle && (
        <div className="control-panel-row-title">
          {props.showColorPicker && <ColorPicker disableAlpha={true} width={18} {...colorPickerProps} />}
          {props.title && <h4>{props.title}</h4>}
        </div>
      )}
      {props.children}
    </div>
  );
};

export default ControlPanelRow;
