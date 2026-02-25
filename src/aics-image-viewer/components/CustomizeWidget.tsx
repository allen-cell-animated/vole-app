import React from "react";

import { colorArrayToObject, colorObjectToArray } from "../shared/utils/colorRepresentations";
import { select, useViewerState } from "../state/store";

import ControlPanelRow from "./shared/ControlPanelRow";

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
        <ControlPanelRow
          color={colorArrayToObject(backgroundColor)}
          onColorChange={(color) => changeViewerSetting("backgroundColor", colorObjectToArray(color))}
          title="Background color"
          verticalMargin={16}
        />
      )}
      {props.visibleControls.boundingBoxColorPicker && (
        <ControlPanelRow
          color={colorArrayToObject(boundingBoxColor)}
          onColorChange={(color) => changeViewerSetting("boundingBoxColor", colorObjectToArray(color))}
          title={
            <>
              Bounding box color
              {!showBoundingBox && <i> - bounding box turned off</i>}
            </>
          }
          verticalMargin={16}
        />
      )}
    </>
  );
};

export default CustomizeWidget;
