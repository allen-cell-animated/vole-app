import React from "react";
import Nouislider, { NouisliderProps } from "nouislider-react";

type CallbackArgs = Parameters<NonNullable<NouisliderProps["onStart"]>>;

const MemoedNouislider = React.memo(
  Nouislider as React.ComponentType<NouisliderProps & { noUpdate: boolean }>,
  ({ noUpdate }) => noUpdate
);

/** A wrapper around `Nouislider` that prevents updates while the slider is being dragged. */
const SmarterSlider: React.FC<NouisliderProps> = (props) => {
  const [noUpdate, setNoUpdate] = React.useState(false);
  const wrapEventHandler = (shouldNotUpdate: boolean, handler?: (...args: CallbackArgs) => void) => {
    return (...args: CallbackArgs) => {
      setNoUpdate(shouldNotUpdate);
      if (handler) handler(...args);
    };
  };

  // TODO: Disabled for now because it causes a bug where the time slider does not update.
  // The onStart wrapEventHandler should be set to `true` for memoization.
  const onStart = wrapEventHandler(false, props.onStart);
  const onEnd = wrapEventHandler(false, props.onEnd);
  return <MemoedNouislider {...{ ...props, noUpdate, onStart, onEnd }} />;
};

export default SmarterSlider;
