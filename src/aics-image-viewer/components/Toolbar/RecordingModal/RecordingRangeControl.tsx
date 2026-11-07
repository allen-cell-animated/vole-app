import { Card, InputNumber, Radio, type RadioChangeEvent, Space } from "antd";
import React, { type ReactElement } from "react";

import { FlexRowAlignCenter } from "../../shared/utils";
import { HINT_CSS_COLOR, RECORDING_CARD_SETTINGS_INDENT_PX } from "./constants";
import { RangeMode, RecordingMode } from "./types";
import { getFrameCount } from "./utils";

import { SettingsContainer, SettingsItem } from "../../shared/SettingsContainer";

import styles from "./styles.module.css";

type RecordingRangeControlProps = {
  totalFrames: number;
  rangeMode: RangeMode;
  min: number;
  max: number;
  frameIncrement: number;
  setFrameIncrement: (frameIncrement: number) => void;
  setRangeMode: (rangeMode: RangeMode) => void;
  setMin: (min: number) => void;
  setMax: (max: number) => void;

  recordingMode: RecordingMode;
  isRecording: boolean;
};

const enum RecordingRangeControlHtmlIds {
  FRAME_RANGE_RADIO = "recording-modal-frame-range-radio",
  FRAME_RANGE_RADIO_LABEL_ID = "recording-modal-frame-range-radio-label",
  FRAME_CUSTOM_RANGE_INPUT = "recording-modal-frame-custom-range-input",
  FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT = "recording-modal-frame-custom-range-frame-increment-input",
}

export default function RecordingRangeControl(props: RecordingRangeControlProps): ReactElement {
  const {
    totalFrames,
    rangeMode,
    min: customMin,
    max: customMax,
    frameIncrement,
    setFrameIncrement,
    setRangeMode,
    setMin: setCustomMin,
    setMax: setCustomMax,
    recordingMode,
    isRecording,
  } = props;

  const customRangeFrames = getFrameCount(customMin, customMax, frameIncrement);

  return (
    <Card size="small" title="Frame range">
      <Radio.Group
        className={styles.rangeRadioGroup}
        // TODO: Use fieldset + label to align with accessibility standards
        value={rangeMode}
        onChange={(e: RadioChangeEvent) => {
          setRangeMode(e.target.value);
        }}
        disabled={isRecording}
        id={RecordingRangeControlHtmlIds.FRAME_RANGE_RADIO}
      >
        <Space orientation="vertical" align="start">
          <Radio value={RangeMode.ALL}>
            All frames{" "}
            {rangeMode === RangeMode.ALL && (
              <span className={styles.hintText} style={{ marginLeft: "4px" }}>
                ({totalFrames} frames total)
              </span>
            )}
          </Radio>
          <Radio value={RangeMode.CURRENT} disabled={isRecording || recordingMode === RecordingMode.VIDEO_MP4}>
            Current frame only
          </Radio>
          <Radio value={RangeMode.CUSTOM}>Custom range</Radio>

          {rangeMode === RangeMode.CUSTOM ? (
            // Render the custom range input in the radio list if selected
            <SettingsContainer
              indentPx={RECORDING_CARD_SETTINGS_INDENT_PX}
              className={styles.customRangeSettingsContainer}
            >
              <SettingsItem label="Range" htmlFor={RecordingRangeControlHtmlIds.FRAME_CUSTOM_RANGE_INPUT}>
                <FlexRowAlignCenter className={styles.flexRowWrap}>
                  <InputNumber
                    id={RecordingRangeControlHtmlIds.FRAME_CUSTOM_RANGE_INPUT}
                    style={{ width: 60 }}
                    aria-label="min frame"
                    controls={false}
                    min={0}
                    max={totalFrames - 1}
                    value={customMin}
                    onChange={(value) => value && setCustomMin(value)}
                    disabled={isRecording}
                  />
                  <p>-</p>
                  <InputNumber
                    style={{ width: 60 }}
                    aria-label="max frame"
                    controls={false}
                    min={customMin}
                    max={totalFrames - 1}
                    value={customMax}
                    onChange={(value) => value && setCustomMax(value)}
                    disabled={isRecording}
                  />
                  <p>of {totalFrames - 1}</p>
                </FlexRowAlignCenter>
              </SettingsItem>
              <SettingsItem
                label="Frame increment"
                htmlFor={RecordingRangeControlHtmlIds.FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT}
              >
                <FlexRowAlignCenter $gap={6}>
                  <InputNumber
                    id={RecordingRangeControlHtmlIds.FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT}
                    value={frameIncrement}
                    onChange={(value) => value && setFrameIncrement(value)}
                    min={1}
                    max={totalFrames - 1}
                    disabled={isRecording}
                    style={{ width: 140 }}
                  />
                  <p style={{ color: HINT_CSS_COLOR }}>({customRangeFrames} frames total)</p>
                </FlexRowAlignCenter>
              </SettingsItem>
            </SettingsContainer>
          ) : null}
        </Space>
      </Radio.Group>
    </Card>
  );
}
