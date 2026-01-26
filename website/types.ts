import type { ReactNode } from "react";

import type { AppProps } from "../src/aics-image-viewer/components/App/types";

export type AppDataProps = Omit<AppProps, "appHeight" | "canvasMargin">;

export type DatasetEntry = {
  name: string;
  description?: string;
  loadParams: AppDataProps;
  hideTitle?: boolean;
};

export type PublicationInfo = {
  url: URL;
  name: string;
  citation: string;
};

export type ProjectEntry = {
  name: string;
  description: ReactNode;
  publicationInfo?: PublicationInfo;
  loadParams?: AppDataProps;
  datasets?: DatasetEntry[];
  inReview?: boolean;
  hideTitle?: boolean;
};

export type LoadDatasetCallback = (appProps: AppDataProps, hideTitle?: boolean) => void;
