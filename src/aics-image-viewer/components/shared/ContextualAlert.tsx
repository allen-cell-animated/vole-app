import { Alert } from "antd";
import React from "react";
import { createPortal } from "react-dom";

type AlertContext = {
  scrollContainer?: HTMLElement | null;
  hide?: boolean;
};

export type ContextualAlertProps = AlertContext & {
  // TODO pretty sure this will fail because it's not a ref...
  target: HTMLElement | null;
  message: React.ReactNode;
};

export type ContextualAlertOptions = AlertContext & {
  timeout?: number;
};

const ALERT_STYLE = {
  position: "absolute",
  bottom: "auto",
  right: "auto",
  zIndex: 1500,
} as const;

/**
 * Antd's `Alert`, but positioned immediately under a `target` element to provide contextual information.
 *
 * This is relatively specialized to the use case of attaching to components inside the control panel. Since the
 * control panel can be vertically scrolled and hidden, it has specific props for responding to both.
 */
export const ContextualAlert: React.FC<ContextualAlertProps> = (props) => {
  const { message, target, scrollContainer, hide } = props;
  const [alertPosition, setAlertPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    const setPosition = (): void => {
      if (target !== null) {
        const rect = target.getBoundingClientRect();
        setAlertPosition({ top: rect.bottom + 10, left: rect.left });
      }
    };

    setPosition();
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", setPosition);
      return () => scrollContainer.removeEventListener("scroll", setPosition);
    }
    return undefined;
  }, [scrollContainer, target]);

  return createPortal(
    <div style={{ ...ALERT_STYLE, ...alertPosition, display: !message || hide ? "none" : "block" }}>
      <Alert message={message} />
    </div>,
    document.body
  );
};

/**
 * Creates an `antd` `Alert` element that stays positioned beneath the `target` element, and a function to show
 * time-limited messages in the `Alert`.
 *
 * This is relatively specialized to the use case of attaching to components inside the control panel. Since the
 * control panel can be vertically scrolled and hidden, it has specific props for responding to both.
 */
export const useContextualAlert = (
  target: HTMLElement | null,
  options: ContextualAlertOptions
): [React.ReactNode, (message: React.ReactNode) => void] => {
  const [message, setMessage] = React.useState<React.ReactNode | undefined>(undefined);
  const messageTimeoutRef = React.useRef<number | undefined>(undefined);

  const timeout = options.timeout ?? 10_000;

  const showMessage = React.useCallback(
    (message: React.ReactNode): void => {
      if (messageTimeoutRef.current !== undefined) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      window.setTimeout(() => setMessage(undefined), timeout);
      setMessage(message);
    },
    [timeout]
  );

  const alert = <ContextualAlert message={message} target={target} {...options} />;

  return [alert, showMessage];
};
