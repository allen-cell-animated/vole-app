/// <reference types="vite/client" />

interface ImportMetaEnv {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_VOLEAPP_VERSION: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_VOLECORE_VERSION: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_BUILD_TIME_UTC: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_BUILD_ENVIRONMENT: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly VITE_BASENAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      readonly npm_package_version: string;
    }
  }
}

export {};
