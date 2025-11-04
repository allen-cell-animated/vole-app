import React from "react";

import { MultisceneUrls } from "../src/aics-image-viewer/components/App/types.ts";
import { MetadataRecord } from "../src/aics-image-viewer/shared/types.ts";
import { encodeImageUrlProp } from "../website/utils/urls.ts";

type Message = MultisceneUrls & {
  meta?: MetadataRecord | MetadataRecord[];
};

const LocalStorageReceiver: React.FC = () => {
  React.useLayoutEffect(() => {
    const receiveMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin) {
        return;
      }

      const message = e.data as Message;
      if (message.scenes === undefined) {
        (e.source as Window)?.postMessage("ERROR: no scenes", e.origin);
        return;
      }

      window.localStorage.setItem("url", encodeImageUrlProp(message));
      if (e.data.meta !== undefined) {
        window.localStorage.setItem("meta", JSON.stringify(message.meta));
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
