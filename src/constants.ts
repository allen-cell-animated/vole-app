export const VOLEAPP_VERSION: string = import.meta.env.VITE_VOLEAPP_VERSION;
export const VOLECORE_VERSION: string = import.meta.env.VITE_VOLECORE_VERSION;
export const VOLEAPP_BUILD_ENVIRONMENT: "production" | "dev" =
  import.meta.env.MODE === "production" ? "production" : "dev";
export const VOLEAPP_BASENAME: string = import.meta.env.VITE_BASENAME;
