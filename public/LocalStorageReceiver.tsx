import React from "react";

import { encodeImageUrlProp } from "../website/utils/url_utils.ts";

const LocalStorageReceiver: React.FC = () => {
  React.useLayoutEffect(() => {
    const receiveMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin) {
        return;
      }

      window.localStorage.setItem("url", encodeImageUrlProp(e.data));
      (e.source as Window)?.postMessage("SUCCESS", e.origin);
    };

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return null;
};

export default LocalStorageReceiver;
