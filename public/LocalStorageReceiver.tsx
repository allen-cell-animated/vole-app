import React from "react";

import { encodeImageUrlProp } from "../website/utils/url_utils.ts";

const LocalStorageReceiver: React.FC = () => {
  React.useLayoutEffect(() => {
    const receiveMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin) {
        return;
      }

      window.localStorage.setItem("url", encodeImageUrlProp(e.data));
      if (e.data.meta !== undefined) {
        window.localStorage.setItem("meta", JSON.stringify(e.data.meta));
      } else {
        window.localStorage.removeItem("meta");
      }
      (e.source as Window)?.postMessage("SUCCESS", e.origin);
    };

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return null;
};

export default LocalStorageReceiver;
