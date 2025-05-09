import { Modal } from "antd";
import React from "react";

import { MultisceneUrls } from "../src/aics-image-viewer/components/App/types.ts";
import { MetadataRecord } from "../src/aics-image-viewer/shared/types.ts";
import { encodeImageUrlProp } from "../website/utils/url_utils.ts";

type Message = MultisceneUrls & {
  meta?: MetadataRecord | MetadataRecord[];
};

function writeStorage(message: Message, source: MessageEventSource | null, origin: string) {
  if (message.scenes === undefined) {
    (source as Window)?.postMessage("ERROR: no scenes", origin);
    return;
  }

  window.localStorage.setItem("url", encodeImageUrlProp(message));
  if (message.meta !== undefined) {
    window.localStorage.setItem("meta", JSON.stringify(message.meta));
  } else {
    window.localStorage.removeItem("meta");
  }
  (source as Window)?.postMessage("SUCCESS", origin);
}

const LocalStorageReceiver: React.FC = () => {
  const [showPermissionModal, setShowPermissionModal] = React.useState(false);

  React.useLayoutEffect(() => {
    const receiveMessage = async (e: MessageEvent) => {
      if (e.origin === window.location.origin) {
        return;
      }

      const message = e.data as Message;

      // const hasStorageAccess = await document.hasStorageAccess();
      const storagePermission = await navigator.permissions.query({ name: "storage-access" });
      if (storagePermission.state === "granted") {
        writeStorage(message, e.source, e.origin);
      } else if (storagePermission.state === "prompt") {
        setShowPermissionModal(true);
      }
    };

    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  return (
    <Modal
      open={showPermissionModal}
      onCancel={() => setShowPermissionModal(false)}
      onOk={}
    >

    </Modal>
  );
};

export default LocalStorageReceiver;
