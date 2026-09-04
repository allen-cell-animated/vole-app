/// <reference types="vite/client" />

interface ImportMetaEnv {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_VOLEAPP_VERSION: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_VOLECORE_VERSION: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_BUILD_TIME_UTC: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_BASENAME: string;
}
