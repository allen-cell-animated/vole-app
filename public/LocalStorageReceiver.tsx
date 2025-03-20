import React from "react";

const LocalStorageReceiver: React.FC = () => {
  React.useLayoutEffect(() => {
    const receiveMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin) {
        return;
      }

      window.localStorage.setItem("scenes", e.data);
      (e.source as Window)?.postMessage("SUCCESS", e.origin);
    };

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return null;
};

export default LocalStorageReceiver;
