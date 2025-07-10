import React from "react";

import { ViewMode } from "../../../src";
import { AppDataProps, ProjectEntry } from "../../types";
import { ExternalLink } from "./utils";

const cellPaintingBaseViewerSettings: Partial<AppDataProps> = {
  viewerChannelSettings: {
    maskChannelName: "",
    groups: [
      {
        name: "Channels",
        channels: [
          { match: [0], enabled: true, lut: ["autoij", "autoij"], color: "C3C3C3" },
          { match: [1], enabled: true },
          { match: [2], enabled: true },
        ],
      },
    ],
  },
  viewerSettings: {
    viewMode: ViewMode.xy,
    density: 2.5,
  },
};

const nucmorphBaseViewerSettings: Partial<AppDataProps> = {
  viewerChannelSettings: {
    maskChannelName: "",
    groups: [
      {
        name: "Channels",
        channels: [
          { match: [0], enabled: true, lut: ["autoij", "autoij"], color: "C3C3C3" },
          { match: [1], enabled: false },
          { match: [2], enabled: true, colorizeEnabled: true },
          { match: [".*"], enabled: false },
        ],
      },
    ],
  },
  viewerSettings: {
    viewMode: ViewMode.xy,
    density: 2.5,
  },
};

export const landingPageContent: ProjectEntry[] = [
  {
    name: "hiPSC FOV-nuclei timelapse datasets",
    inReview: false,
    description: (
      <p>
        3D timelapses of nuclei in growing hiPS cell colonies of three different starting sizes. Timelapse datasets
        include 3D transmitted-light bright-field and lamin B1-mEGFP fluorescence 20x images and 3D nuclear segmentation
        images. These datasets are{" "}
        <ExternalLink href="https://open.quiltdata.com/b/allencell/tree/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/">
          available for download on Quilt
        </ExternalLink>{" "}
        .
      </p>
    ),
    publicationInfo: {
      url: new URL("https://doi.org/10.1016/j.cels.2025.101265"),
      name: "Colony context and size-dependent compensation mechanisms give rise to variations in nuclear growth trajectories",
      citation: "Cell Systems, May 2025",
    },
    datasets: [
      {
        name: "CellPainting test dataset",
        loadParams: {
          imageUrl: {
            scenes: [
              [
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch1sk5fk1fl1.tiff",
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch2sk5fk1fl1.tiff",
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch3sk5fk1fl1.tiff",
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch4sk5fk1fl1.tiff",
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch5sk5fk1fl1.tiff",
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch6sk5fk1fl1.tiff",
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch7sk5fk1fl1.tiff",
        "https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch8sk5fk1fl1.tiff",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...cellPaintingBaseViewerSettings,
        },
      },
      {
        name: "Small colony",
        loadParams: {
          imageUrl: {
            scenes: [
              [
                "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/raw.ome.zarr",
                "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/seg.ome.zarr",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...nucmorphBaseViewerSettings,
        },
      },
      {
        name: "Medium colony",
        loadParams: {
          imageUrl: {
            scenes: [
              [
                "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_06_medium/raw.ome.zarr",
                "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_06_medium/seg.ome.zarr",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...nucmorphBaseViewerSettings,
        },
      },
      {
        name: "Large colony",
        loadParams: {
          imageUrl: {
            scenes: [
              [
                "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_05_large/raw.ome.zarr",
                "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_05_large/seg.ome.zarr",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...nucmorphBaseViewerSettings,
        },
      },
    ],
  },
];
