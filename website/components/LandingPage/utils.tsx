import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { type ReactElement } from "react";
import styled, { css } from "styled-components";

const FlexDiv = styled.div<{ $gap?: number }>`
  display: flex;
  ${(props) => {
    // Gap between items is parameterized
    if (props.$gap) {
      return css`
        gap: ${props.$gap}px;
      `;
    }
    return;
  }}
`;

/**
 * A flexbox container that lays out children in a column.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexColumn = styled(FlexDiv)`
  flex-direction: column;
`;

/**
 * A flexbox container that lays out children in a column, and aligns all items
 * to the horizontal center.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexColumnAlignCenter = styled(FlexColumn)`
  align-items: center;
`;

/**
 * A flexbox container that lays out children in a row.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexRow = styled(FlexDiv)`
  flex-direction: row;
`;

/**
 * A flexbox container that lays out children in a row, and aligns all items
 * to the vertical center.
 * @param $gap: The gap, in pixels, between each child element. 0 by default.
 */
export const FlexRowAlignCenter = styled(FlexRow)`
  align-items: center;
`;

/**
 * Text that is visually hidden, but still accessible to screen readers.
 * Based on https://tailwindcss.com/docs/screen-readers
 */
export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

export function ExternalLink(props: { href: string; children: React.ReactNode }): ReactElement {
  return (
    <a href={props.href} rel="noopener noreferrer" target="_blank">
      {props.children}
      <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "0px", marginLeft: "3px" }} />
    </a>
  );
}
