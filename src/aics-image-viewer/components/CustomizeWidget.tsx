import React from "react";

import type { Styles } from "../shared/types";
import { type ColorArray, colorArrayToObject, colorObjectToArray } from "../shared/utils/colorRepresentations";
import type { ViewerSettingUpdater } from "./ViewerStateProvider/types";

import ColorPicker from "./ColorPicker";
import { connectToViewerState } from "./ViewerStateProvider";

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
  // From parent
  visibleControls: {
    backgroundColorPicker: boolean;
    boundingBoxColorPicker: boolean;
  };

  // From viewer state
  showBoundingBox: boolean;
  backgroundColor: ColorArray;
  boundingBoxColor: ColorArray;

  changeViewerSetting: ViewerSettingUpdater;
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = (props) => (
  <>
    {props.visibleControls.backgroundColorPicker && (
      <ColorPickerRow
        color={props.backgroundColor}
        onColorChange={(color) => props.changeViewerSetting("backgroundColor", color)}
      >
        Background color
      </ColorPickerRow>
    )}
    {props.visibleControls.boundingBoxColorPicker && (
      <ColorPickerRow
        color={props.boundingBoxColor}
        onColorChange={(color) => props.changeViewerSetting("boundingBoxColor", color)}
      >
        Bounding box color
        {!props.showBoundingBox && <i> - bounding box turned off</i>}
      </ColorPickerRow>
    )}
  </>
);

const STYLES: Styles = {
  colorPickerRow: {
    padding: "14px 0",
    display: "flex",
    borderBottom: "1px solid #6e6e6e",
    color: "var(--color-controlpanel-text)",
  },
  colorPicker: {
    marginRight: "16px",
  },
};

export default connectToViewerState(CustomizeWidget, [
  "showBoundingBox",
  "backgroundColor",
  "boundingBoxColor",
  "changeViewerSetting",
]);
