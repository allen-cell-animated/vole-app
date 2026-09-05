/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VOLEAPP_VERSION: string;
  readonly VITE_VOLECORE_VERSION: string;
  readonly VITE_BUILD_TIME_UTC: string;
  readonly VITE_BASENAME: string;
}
