import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, type RouteObject, RouterProvider } from "react-router-dom";

import {
  decodeGitHubPagesUrl,
  isEncodedPathUrl,
  resolveBasename,
  tryRemoveHashRouting,
} from "../website/utils/gh_route_utils";
import firestore from "./firebase/configure_firebase";

import StyleProvider from "../src/aics-image-viewer/components/StyleProvider";
import ErrorPage from "../website/components/ErrorPage";
import LocalStorageReceiver from "./LocalStorageReceiver";

import "./App.css";

const enum Subpages {
  VIEWER = "viewer",
  WRITE_STORAGE = "write_storage",
}
const subpagesList = [Subpages.VIEWER, Subpages.WRITE_STORAGE];

// vars filled at build time using webpack DefinePlugin
console.log(`vole-app ${VOLEAPP_BUILD_ENVIRONMENT} build`);
console.log(`vole-app Version: ${VOLEAPP_VERSION}`);
console.log(`vole-core Version: ${VOLECORE_VERSION}`);

const basename = resolveBasename(VOLEAPP_BASENAME, subpagesList);
if (basename !== VOLEAPP_BASENAME) {
  console.log(`vole-app Basename: ${VOLEAPP_BASENAME} (resolved to "${basename}")`);
} else {
  console.log(`vole-app Basename: ${VOLEAPP_BASENAME}`);
}

// Decode URL path if it was encoded for GitHub pages or uses hash routing.
const locationUrl = new URL(window.location.toString());
if (locationUrl.hash !== "" || isEncodedPathUrl(locationUrl)) {
  const decodedUrl = tryRemoveHashRouting(decodeGitHubPagesUrl(locationUrl));
  const newRelativePath = decodedUrl.pathname + decodedUrl.search + decodedUrl.hash;
  console.log("Redirecting to " + newRelativePath);
  // Replaces the query string path with the original path now that the
  // single-page app has loaded. This lets routing work as normal below.
  window.history.replaceState(null, "", newRelativePath);
}

// TODO these components are now lazy loaded. Should they get `Suspense`s around them? What should we fall back to?
const routes: RouteObject[] = [
  {
    path: "/",
    lazy: async () => {
      const LandingPage = (await import("../website/components/LandingPage")).default;
      return {
        Component: () => <LandingPage firestore={firestore} />,
      };
    },
    errorElement: <ErrorPage />,
  },
  {
    path: Subpages.VIEWER,
    lazy: async () => {
      const AppWrapper = (await import("../website/components/AppWrapper")).default;
      return {
        Component: () => <AppWrapper firestore={firestore} />,
      };
    },
    errorElement: <ErrorPage />,
  },
  {
    path: Subpages.WRITE_STORAGE,
    element: <LocalStorageReceiver />,
    errorElement: <ErrorPage />,
  },
];

const router = createBrowserRouter(routes, { basename: basename });

const root = createRoot(document.getElementById("cell-viewer")!);
root.render(
  <StyleProvider>
    <RouterProvider router={router} />
  </StyleProvider>
);
