import type { VolumeDims } from "@aics/vole-core";
import { Radio, Select } from "antd";
import React from "react";

import { select, useViewerState } from "../../state/store";

import "./styles.css";

export type ResolutionControlsProps = {
  multiscaleDims: VolumeDims[];
  multiscaleIndex?: number;
  getPopupContainer?: () => HTMLElement;
};

const ResolutionControls: React.FC<ResolutionControlsProps> = (props) => {
  const useExactScaleLevel = useViewerState(select("useExactScaleLevel"));
  const scaleLevelIndex = useViewerState(select("scaleLevelIndex"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  return (
    <>
      <span style={{ color: "var(--color-button-tertiary-text)" }}>Resolution</span>
      <Radio.Group
        value={useExactScaleLevel}
        onChange={(e) => changeViewerSetting("useExactScaleLevel", e.target.value)}
      >
        <Radio.Button value={false}>Auto</Radio.Button>
        <Radio.Button value={true}>Manual</Radio.Button>
      </Radio.Group>
      <Select
        className="select-toolbar select-resolution"
        popupClassName="viewer-toolbar-dropdown"
        getPopupContainer={props.getPopupContainer}
        style={{ minWidth: 150 }}
        value={useExactScaleLevel ? scaleLevelIndex : (props.multiscaleIndex ?? scaleLevelIndex)}
        onChange={(value) => changeViewerSetting("scaleLevelIndex", value)}
        disabled={!useExactScaleLevel}
      >
        {props.multiscaleDims.map((dims, idx) => {
          const [_t, _c, z, y, x] = dims.shape;
          return (
            <Select.Option key={idx} value={idx}>
              {x} x {y} x {z}
            </Select.Option>
          );
        })}
      </Select>
    </>
  );
};

export default ResolutionControls;
