import { ReactNode } from "react";

import { AppProps } from "../src/aics-image-viewer/components/App/types";

export type AppDataProps = Omit<AppProps, "appHeight" | "canvasMargin">;

export type DatasetEntry = {
  name: string;
  description?: string;
  loadParams: AppDataProps;
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
};
