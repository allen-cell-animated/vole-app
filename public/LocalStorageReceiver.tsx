import React from "react";

const LocalStorageReceiver: React.FC = () => {
  React.useLayoutEffect(() => {
    const receiveMessage = (e: MessageEvent) => {
      console.log(e.data);
    };

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return null;
};

export default LocalStorageReceiver;
