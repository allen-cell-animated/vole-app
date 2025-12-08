import Nouislider, { type NouisliderProps } from "nouislider-react";
import React from "react";

type CallbackArgs = Parameters<NonNullable<NouisliderProps["onStart"]>>;

const MemoedNouislider = React.memo(
  Nouislider as React.ComponentType<NouisliderProps & { noUpdate: boolean }>,
  (_prevProps, { noUpdate }) => noUpdate
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

  const onStart = wrapEventHandler(true, props.onStart);
  const onEnd = wrapEventHandler(false, props.onEnd);
  return <MemoedNouislider {...{ ...props, noUpdate, onStart, onEnd }} />;
};

export default SmarterSlider;
