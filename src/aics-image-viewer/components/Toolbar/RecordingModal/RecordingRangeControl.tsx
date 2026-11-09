import { Card, InputNumber, Radio, type RadioChangeEvent, Space } from "antd";
import React, { type ReactElement } from "react";

import { FlexRowAlignCenter } from "../../shared/utils";
import { RangeMode, RecordingMode } from "./types";
import { getFrameCount } from "./utils";

import { SettingsContainer, SettingsItem } from "../../shared/SettingsContainer";

import styles from "./styles.module.css";

type RecordingRangeControlProps = {
  totalFrames: number;
  rangeMode: RangeMode;
  customMin: number;
  customMax: number;
  frameIncrement: number;
  setFrameIncrement: (frameIncrement: number) => void;
  setRangeMode: (rangeMode: RangeMode) => void;
  setCustomMax: (customMin: number) => void;
  setCustomMin: (customMax: number) => void;

  recordingMode: RecordingMode;
  isRecording: boolean;

  indentPx: number;
};

const enum RecordingRangeControlHtmlIds {
  FRAME_RANGE_RADIO = "recording-modal-frame-range-radio",
  FRAME_RANGE_RADIO_LABEL_ID = "recording-modal-frame-range-radio-label",
  FRAME_CUSTOM_RANGE_INPUT = "recording-modal-frame-custom-range-input",
  FRAME_CUSTOM_RANGE_FRAME_INCREMENT_INPUT = "recording-modal-frame-custom-range-frame-increment-input",
}

/**
 * Styled card that allows users to select a frame range (all, current, or
 * custom) and shows additional controls for the custom frame range when
 * selected.
 */
export default function RecordingRangeControl(props: RecordingRangeControlProps): ReactElement {
  const {
    totalFrames,
    rangeMode,
    customMin,
    customMax,
    frameIncrement,
    setFrameIncrement,
    setRangeMode,
    setCustomMax,
    setCustomMin,
    recordingMode,
    isRecording,
  } = props;

  const customRangeFrames = getFrameCount(customMin, customMax, frameIncrement);

  const onSetMin: (value: number) => void = (value) => {
    if (Number.isFinite(value)) {
      value = Math.max(1, value); // Ensure 1-based indexing
      setCustomMin(value);
      setCustomMax(Math.max(value, customMax));
    }
  };

  const onSetMax: (value: number) => void = (value) => {
    if (Number.isFinite(value)) {
      value = Math.min(value, totalFrames);
      setCustomMax(value);
      setCustomMin(Math.min(value, customMin));
    }
  };
  console.log(customMin, customMax, totalFrames);

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
            <SettingsContainer indentPx={props.indentPx} className={styles.customRangeSettingsContainer}>
              <SettingsItem label="Range" htmlFor={RecordingRangeControlHtmlIds.FRAME_CUSTOM_RANGE_INPUT}>
                <FlexRowAlignCenter className={styles.flexRowWrap}>
                  <InputNumber
                    id={RecordingRangeControlHtmlIds.FRAME_CUSTOM_RANGE_INPUT}
                    style={{ width: 60 }}
                    aria-label="min frame"
                    controls={false}
                    min={1}
                    max={totalFrames}
                    value={customMin}
                    onChange={(value) => value !== null && onSetMin(value)}
                    disabled={isRecording}
                  />
                  <p>-</p>
                  <InputNumber
                    style={{ width: 60 }}
                    aria-label="max frame"
                    controls={false}
                    min={customMin}
                    max={totalFrames}
                    value={customMax}
                    onChange={(value) => value !== null && onSetMax(value)}
                    disabled={isRecording}
                  />
                  <p>of {totalFrames}</p>
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
                    max={totalFrames}
                    disabled={isRecording}
                    style={{ width: 140 }}
                  />
                  <p className={styles.hintText}>({customRangeFrames} frames total)</p>
                </FlexRowAlignCenter>
              </SettingsItem>
            </SettingsContainer>
          ) : null}
        </Space>
      </Radio.Group>
    </Card>
  );
}
