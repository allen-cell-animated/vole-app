import { Button } from "antd";
import React from "react";
import styled from "styled-components";

// TODO: Make exports here for primary/tertiary buttons to abstract away
// Ant button styling.

// Enforce the primary type for behavior on hover.
const PrimaryButton = React.forwardRef<HTMLButtonElement, { children?: React.ReactNode }>((props, ref) => (
  <Button {...props} ref={ref} type="primary">
    {props.children}
  </Button>
));
// Used for debugging in React. Eslint complains if not set.
PrimaryButton.displayName = "PrimaryButton";

// Secondary button is outlined but turns solid on hover (uses primary button behavior).
export const SecondaryButton = styled(PrimaryButton)`
  &&& {
    background-color: var(--color-button-secondary-bg);
    border: 1px solid var(--color-button-secondary-outline);
    color: var(--color-button-secondary-text);
  }
` as typeof Button;
