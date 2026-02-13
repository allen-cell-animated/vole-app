import React from "react";

import type { Styles } from "../shared/types";
import { type ColorArray, colorArrayToObject, colorObjectToArray } from "../shared/utils/colorRepresentations";
import { select, useViewerState } from "../state/store";

import ColorPicker from "./ColorPicker";

const ColorPickerRow: React.FC<{
  color: ColorArray;
  onColorChange: (color: ColorArray) => void;
  children?: React.ReactNode;
}> = ({ color, onColorChange, children }) => (
  <div style={STYLES.colorPickerRow}>
    <span style={STYLES.colorPicker}>
      <ColorPicker
        color={colorArrayToObject(color)}
        onColorChange={(color) => onColorChange(colorObjectToArray(color))}
        width={18}
        disableAlpha={true}
      />
    </span>
    <span>{children}</span>
  </div>
);

export interface CustomizeWidgetProps {
  visibleControls: {
    backgroundColorPicker: boolean;
    boundingBoxColorPicker: boolean;
  };
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = (props) => {
  const showBoundingBox = useViewerState(select("showBoundingBox"));
  const backgroundColor = useViewerState(select("backgroundColor"));
  const boundingBoxColor = useViewerState(select("boundingBoxColor"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  return (
    <>
      {props.visibleControls.backgroundColorPicker && (
        <ColorPickerRow
          color={backgroundColor}
          onColorChange={(color) => changeViewerSetting("backgroundColor", color)}
        >
          Background color
        </ColorPickerRow>
      )}
      {props.visibleControls.boundingBoxColorPicker && (
        <ColorPickerRow
          color={boundingBoxColor}
          onColorChange={(color) => changeViewerSetting("boundingBoxColor", color)}
        >
          Bounding box color
          {!showBoundingBox && <i> - bounding box turned off</i>}
        </ColorPickerRow>
      )}
    </>
  );
};

const STYLES: Styles = {
  colorPickerRow: {
    padding: "14px 26px",
    display: "flex",
    borderBottom: "1px solid #6e6e6e",
    color: "var(--color-controlpanel-text)",
  },
  colorPicker: {
    marginRight: "16px",
    display: "flex",
    alignItems: "center",
  },
};

export default CustomizeWidget;
