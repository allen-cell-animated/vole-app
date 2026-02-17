import { map } from "lodash";
import React from "react";
import { type ColorResult, SketchPicker } from "react-color";

import type { ColorObject } from "../../shared/utils/colorRepresentations";

import "./styles.css";

// if there are fewer than this many screen pixels below the swatch but more above, open above the swatch
const OPEN_ABOVE_MARGIN = 310;

type ColorChangeHandler = (currentColor: ColorObject, prevColor?: ColorObject, idx?: number) => void;

interface ColorPickerProps {
  color: ColorObject;
  width: number;
  onColorChange?: ColorChangeHandler;
  onColorChangeComplete?: ColorChangeHandler;
  idx?: any;
  disableAlpha?: boolean;
}

const DEFAULT_COLOR = {
  r: "241",
  g: "112",
  b: "19",
  a: "1",
};

const ColorPicker: React.FC<ColorPickerProps> = (props) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openAboveSwatch, setOpenAboveSwatch] = React.useState(false);
  const [currentColor, setCurrentColor] = React.useState(props.color || DEFAULT_COLOR);

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
    // supply onColorChange callback in props.
    props.onColorChange?.(color.rgb, currentColor, props.idx);
  };

  const handleChangeComplete = (color: ColorResult): void => {
    setCurrentColor(color.rgb);
    // supply onColorChange callback in props.
    props.onColorChangeComplete?.(color.rgb, currentColor, props.idx);
  };

  React.useEffect(() => setCurrentColor(props.color), [props.color]);

  const width = props.width || 36;
  const popoverDirectionStyle = openAboveSwatch ? { bottom: "18px" } : { top: "3px" };
  return (
    <div className="color-picker">
      <div
        ref={swatchRef}
        onClick={handleClick}
        className="color-picker-swatch"
        style={{ width: `${width}px`, background: `rgba(${map(currentColor, (ele) => ele)})` }}
      />
      <div style={{ position: "absolute" }}>
        {isOpen ? (
          <div className="color-picker-popover" style={popoverDirectionStyle}>
            <div className="color-picker-cover" onClick={handleClose} />
            <SketchPicker
              color={currentColor}
              onChange={handleChange}
              onChangeComplete={handleChangeComplete}
              disableAlpha={props.disableAlpha}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ColorPicker;
