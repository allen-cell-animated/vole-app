import React, { type ReactElement } from "react";
import styled, { css } from "styled-components";

// Adapted from "CSS-only middle truncation with ellipsis"
// by Mark Chitty https://codepen.io/markchitty/pen/RNZbRE

type MiddleTruncatedTextProps = {
  text: string;
  /** Minimum characters to show at the start of the text. 3 by default. */
  startCharacters?: number;
  /**
   * Minimum characters to show at the end of the text. Hidden by start characters if the container
   * does not have enough space. 35 by default.
   */
  endCharacters?: number;
};

const defaultProps: Partial<MiddleTruncatedTextProps> = {
  startCharacters: 3,
  endCharacters: 35,
};

const MiddleTruncatedTextContainer = styled.div<{ $startChars: number; $endChars: number }>`
  display: flex;
  flex-direction: row;
  vertical-align: bottom;
  white-space: nowrap;

  ${(props) => {
    // Determined experimentally. If this is too high, excess padding will appear to the right of
    // the end text. If this is too low, the end text will be clipped.
    const characterPxWidthToFontSizeRatio = 0.5;
    return css`
      --startWidth: calc(1em * ${props.$startChars + 3} * ${characterPxWidthToFontSizeRatio});
      --endWidth: calc(1em * ${props.$endChars} * ${characterPxWidthToFontSizeRatio});

      & span {
        display: inline-block;
        vertical-align: bottom;
        white-space: nowrap;
        overflow: hidden;
      }

      & span:first-child {
        max-width: calc(100% - var(--endWidth));
        min-width: var(--startWidth);
        text-overflow: ellipsis;
        overflow: hidden;
      }

      & span:last-child {
        max-width: calc(100% - var(--startWidth));
        direction: rtl;
        z-index: 800;
      }
    `;
  }}
`;

/**
 * Renders text that will be truncated with ellipses in the middle of the text if there isn't
 * enough space to show the full text. The number of characters shown at the start and end of the text are configurable.
 *
 * @example
 * ```
 * <MiddleTruncatedText text="This is a long text that will be truncated in the middle" startCharacters={3} endCharacters={5} />
 * ```
 * can be rendered as any of the following depending on the available space:
 * - `This is a long text that will be truncated in the middle`
 * - `This is a long text that will ...iddle`
 * - `This is a long text...iddle`
 * - `Thi...iddle`
 * - `Thi...`
 */
export default function MiddleTruncatedText(inputProps: MiddleTruncatedTextProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<MiddleTruncatedTextProps>;

  let startChars = Math.max(0, props.startCharacters);
  let endChars = Math.max(0, props.endCharacters);
  if (props.text.length <= startChars + endChars) {
    endChars = props.text.length - startChars;
  }

  const splitIndex = Math.max(0, props.text.length - endChars);
  const startText = props.text.slice(0, splitIndex);
  const endText = props.text.slice(splitIndex);

  // TODO: Text characters in endText can be partially clipped. Is there a way to prevent this from happening?

  return (
    <MiddleTruncatedTextContainer
      $startChars={startChars}
      $endChars={endChars}
      aria-label={props.text}
      title={props.text}
    >
      {
        // The `$lrm;` is a non-printing character that indicates text punctuation should be rendered as left-to-right instead of rtl.
        // It's included to prevent a visual bug where punctuation at the start (ex: !?_.:, etc.)
        // of `endText` is rendered at the end instead. See https://en.wikipedia.org/wiki/Left-to-right_mark.
        // (we are using rtl rendering so that the ellipses render on the left side of the text. )
      }
      <span>{startText}</span>
      <span>&lrm;{endText}</span>
    </MiddleTruncatedTextContainer>
  );
}
