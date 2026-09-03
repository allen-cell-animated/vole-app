export const VOLEAPP_VERSION: string = JSON.parse(import.meta.env.VITE_VOLEAPP_VERSION);
export const VOLECORE_VERSION: string = JSON.parse(import.meta.env.VITE_VOLECORE_VERSION);
export const VOLEAPP_BUILD_ENVIRONMENT: "production" | "dev" =
  JSON.parse(import.meta.env.MODE) === "production" ? "production" : "dev";
export const VOLEAPP_BASENAME: string = JSON.parse(import.meta.env.VITE_BASENAME);
