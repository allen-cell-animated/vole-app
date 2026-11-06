import { Progress } from "antd";
import Tooltip from "antd/es/tooltip";
import React, { type ReactElement, useRef } from "react";

type StyledInlineProgressProps = {
  /**
   * An integer percentage. Will be floored and clamped to the [0, 100] range.
   */
  percent: number;
  error?: boolean;
  sizePx?: number;
};

/**
 * A small, circular Progress indicator intended to be used inline. Also
 * includes error styling and a tooltip showing the current percentage of
 * completion.
 */
export default function StyledInlineProgress(props: StyledInlineProgressProps): ReactElement {
  const tooltipContainerRef = useRef<HTMLDivElement>(null);

  const percent = Math.min(100, Math.max(0, Math.floor(props.percent)));

  let progressBarColor = "var(--color-progress-default)";
  if (props.error) {
    progressBarColor = "var(--color-progress-error)";
  } else if (percent >= 100) {
    progressBarColor = "var(--color-progress-success)";
  }

  return (
    <div ref={tooltipContainerRef}>
      <Tooltip
        title={percent + "%"}
        style={{ verticalAlign: "middle" }}
        trigger={["focus", "hover"]}
        // Fixes bug when Tooltip is rendered inside of a Modal or Popover
        getTooltipContainer={() => tooltipContainerRef.current ?? document.body}
      >
        <Progress
          style={{ verticalAlign: "middle" }}
          type="circle"
          size={props.sizePx ?? 22}
          percent={percent}
          showInfo={false}
          strokeColor={progressBarColor}
          strokeWidth={12}
        />
      </Tooltip>
    </div>
  );
}
