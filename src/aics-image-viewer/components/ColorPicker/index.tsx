import { map } from "lodash";
import React from "react";
import { type ColorResult, SketchPicker } from "react-color";
import type { PresetColor } from "react-color/lib/components/sketch/Sketch";

import type { ColorObject } from "../../shared/utils/colorRepresentations";

import "./styles.css";

// if there are fewer than this many screen pixels below the swatch but more above, open above the swatch
const OPEN_ABOVE_MARGIN = 310;

type ColorChangeHandler = (currentColor: ColorObject, prevColor: ColorObject) => void;

export interface ColorPickerProps {
  color: ColorObject;
  width: number;
  onColorChange?: ColorChangeHandler;
  onColorChangeComplete?: ColorChangeHandler;
  alpha?: number;
  disableAlpha?: boolean;
  onAlphaChange?: (alpha: number, prevAlpha: number) => void;
  onAlphaChangeComplete?: (alpha: number, prevAlpha: number) => void;
}

const DEFAULT_COLOR = {
  r: "241",
  g: "112",
  b: "19",
  a: "1",
};

const PRESET_COLOR_HEX = ["#ffffff", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#c0c0c0"];

const PRESET_COLORS: PresetColor[] = PRESET_COLOR_HEX.map((color) => ({ color, title: color.toUpperCase() }));

const ColorPicker: React.FC<ColorPickerProps> = (props) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openAboveSwatch, setOpenAboveSwatch] = React.useState(false);
  const [currentColor, setCurrentColor] = React.useState(props.color || DEFAULT_COLOR);
  const [currentAlpha, setCurrentAlpha] = React.useState(props.alpha || 1);

  const swatchRef = React.useRef<HTMLDivElement>(null);

  const handleClick = (): void => {
    const swatchRect = swatchRef.current!.getBoundingClientRect();
    const noRoomBelowSwatch = swatchRect.bottom > window.innerHeight - OPEN_ABOVE_MARGIN;
    setIsOpen(!isOpen);
    setOpenAboveSwatch(noRoomBelowSwatch && swatchRect.top > OPEN_ABOVE_MARGIN);
  };

  const handleClose = (): void => setIsOpen(false);

  const handleChange = (color: ColorResult): void => {
    setCurrentColor(color.rgb);
    setCurrentAlpha(color.rgb.a ?? currentAlpha);
    // supply onColorChange callback in props.
    props.onColorChange?.(color.rgb, currentColor);
    props.onAlphaChange?.(color.rgb.a ?? currentAlpha, currentAlpha);
  };

  const handleChangeComplete = (color: ColorResult): void => {
    setCurrentColor(color.rgb);
    setCurrentAlpha(color.rgb.a ?? currentAlpha);
    // supply onColorChange callback in props.
    props.onColorChangeComplete?.(color.rgb, currentColor);
    props.onAlphaChangeComplete?.(color.rgb.a ?? currentAlpha, currentAlpha);
  };

  React.useEffect(() => setCurrentColor(props.color), [props.color]);
  React.useEffect(() => setCurrentAlpha(props.alpha ?? currentAlpha), [props.alpha]);

  const colorWithAlpha = { ...currentColor, a: currentAlpha };

  const width = props.width || 36;
  const popoverDirectionStyle = openAboveSwatch ? { bottom: "18px" } : { top: "3px" };
  return (
    <div className="color-picker">
      <div className="color-picker-swatch-bg" ref={swatchRef} onClick={handleClick} style={{ width: `${width}px` }}>
        <div className="color-picker-swatch" style={{ background: `rgba(${map(colorWithAlpha, (ele) => ele)})` }} />
      </div>
      <div style={{ position: "absolute" }}>
        {isOpen ? (
          <div className="color-picker-popover" style={popoverDirectionStyle}>
            <div className="color-picker-cover" onClick={handleClose} />
            <SketchPicker
              color={colorWithAlpha}
              onChange={handleChange}
              onChangeComplete={handleChangeComplete}
              disableAlpha={props.disableAlpha}
              presetColors={PRESET_COLORS}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ColorPicker;
