import React, { useDebugValue } from "react";
import ReactDOM from "react-dom";
import { find } from "lodash";

import "antd/dist/antd.css";

import "./App.scss";

import { ImageViewerApp } from "../src";
import { ChannelNameMapping } from "../src/aics-image-viewer/shared/utils/formatChannelNames.ts";
import FirebaseRequest from "./firebase";

const mapping = [
  { test: /(CMDRP)|(Memb)/, label: "Membrane" },
  { test: /(EGFP)|(RFPT)|(STRUCT)/, label: "Labeled structure" },
  { test: /(H3342)|(DNA)/, label: "DNA" },
  { test: /(100)|(Bright)/, label: "Bright field" },
];
const channelGroupingMap = {
  "Observed channels": [
    "CMDRP",
    "EGFP",
    "mtagRFPT",
    "H3342",
    "H3342_3",
    "Bright_100",
    "Bright_100X",
    "TL 100x",
    "TL_100x",
    "Bright_2",
  ],
  "Segmentation channels": ["SEG_STRUCT", "SEG_Memb", "SEG_DNA"],
  "Contour channels": ["CON_Memb", "CON_DNA"],
};

function parseQueryString() {
  var pairs = location.search.slice(1).split("&");
  var result = {};
  pairs.forEach(function (pair) {
    pair = pair.split("=");
    result[pair[0]] = decodeURIComponent(pair[1] || "");
  });
  return JSON.parse(JSON.stringify(result));
}
const params = parseQueryString();

const args = {
  //baseurl: "http://dev-aics-dtp-001.corp.alleninstitute.org/cellviewer-1-4-0/Cell-Viewer_Thumbnails/",
  baseurl:
    "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.4.0/Cell-Viewer_Thumbnails",
  cellid: 2025,
  cellPath: "AICS-22/AICS-22_8319_2025",
  fovPath: "AICS-22/AICS-22_8319",
  fovDownloadHref:
    "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=F8319",
  cellDownloadHref:
    "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=C2025",
  channelsOn: [0, 1, 2],
  surfacesOn: [],
};

if (params) {
  if (params.ch) {
    // ?ch=1,2
    args.channelsOn = (params.ch.split(",")).map(numstr => parseInt(numstr, 10));
  }
  // quick way to load a atlas.json from a special directory.
  //
  if (params.file) {
    // ?file=relative-path-to-atlas-on-isilon
    args.cellid = 1;
    args.baseurl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/";
    args.cellPath = params.file;
    args.fovPath = params.file;
    args.fovDownloadHref = "";
    args.cellDownloadHref = "";
    runApp();
  } else if (params.dataset && params.id) {
    // ?dataset=aics_hipsc_v2020.1&id=232265
    const db = new FirebaseRequest();

    db.getAvailableDatasets()
      .then((datasets) => {
        const selectedDataset = find(datasets, { id: params.dataset });
        return selectedDataset;
      })
      .then((dataset) => {
        return db.selectDataset(dataset.manifest);
      })
      .then((datasetData) => {
        args.baseurl = datasetData.volumeViewerDataRoot;
        args.cellDownloadHref = datasetData.downloadRoot + "/" + params.id;
        //fovDownloadHref = datasetData.downloadRoot + "/" + params.id;
      })
      .then(() => {
        return db.getFileInfoByCellId(params.id);
      })
      .then((fileInfo) => {
        args.cellPath = fileInfo.volumeviewerPath;
        args.fovPath = fileInfo.fovVolumeviewerPath;
        // strip "_atlas.json" because the viewer is going to add it :(
        args.cellPath = args.cellPath.replace("_atlas.json", "");
        args.fovPath = args.fovPath.replace("_atlas.json", "");
        runApp();

        // only now do we have all the data needed
      });
  } else {
    runApp();
  }
} else {
  runApp();
}

function runApp() {
  ReactDOM.render(
    <ImageViewerApp
      cellId={args.cellid}
      baseUrl={args.baseurl}
      //cellPath="AICS-25/AICS-25_6035_43757"
      //fovPath="AICS-25/AICS-25_6035"
      // appHeight="90vh"
      cellPath={args.cellPath}
      fovPath={args.fovPath}
      defaultVolumesOn={args.channelsOn}
      defaultSurfacesOn={args.surfacesOn}
      fovDownloadHref={args.fovDownloadHref}
      cellDownloadHref={args.cellDownloadHref}
      channelNameMapping={mapping}
      groupToChannelNameMap={channelGroupingMap}
    />,
    document.getElementById("cell-viewer")
  );
}
