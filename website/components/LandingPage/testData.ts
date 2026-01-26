import { type NumberType, type RawArrayInfo, type RawArrayLoaderOptions, VolumeMaker } from "@aics/vole-core";

import { ViewMode } from "../../../src";
import type { AppDataProps, ProjectEntry } from "../../types";

function createTestVolume(dtype: NumberType): RawArrayLoaderOptions {
  const sizeX = 64;
  const sizeY = 64;
  const sizeZ = 64;
  const imgData: RawArrayInfo = {
    name: "AICS-10_5_5",
    sizeX,
    sizeY,
    sizeZ,
    sizeC: 3,
    physicalPixelSize: [1, 1, 1],
    spatialUnit: "",
    channelNames: ["DRAQ5", "EGFP", "SEG_Memb"],
  };

  // generate some raw volume data
  const channelVolumes = [
    VolumeMaker.createSphere(sizeX, sizeY, sizeZ, 24, dtype),
    VolumeMaker.createTorus(sizeX, sizeY, sizeZ, 24, 8, dtype),
    VolumeMaker.createCone(sizeX, sizeY, sizeZ, 24, 24, dtype),
  ];
  const alldata = VolumeMaker.concatenateArrays(channelVolumes, dtype);
  return {
    metadata: imgData,
    data: {
      dtype: dtype,
      // [c,z,y,x]
      shape: [channelVolumes.length, sizeZ, sizeY, sizeX],
      // the bits (assumed uint8!!)
      buffer: new DataView(alldata.buffer),
    },
  };
}

const v0 = createTestVolume("uint8");
const v1 = createTestVolume("uint16");
const v2 = createTestVolume("float32");

const testDataBaseViewerSettings: Partial<AppDataProps> = {
  viewerChannelSettings: {
    maskChannelName: "",
    groups: [
      {
        name: "Channels",
        channels: [
          { match: [0], enabled: true, lut: ["autoij", "autoij"] },
          { match: [1], enabled: true, lut: ["autoij", "autoij"] },
          { match: [2], enabled: true, lut: ["autoij", "autoij"] },
        ],
      },
    ],
  },
  viewerSettings: {
    viewMode: ViewMode.threeD,
    density: 2.5,
  },
};

export const TEST_DATA_CONTENT: ProjectEntry[] = [
  {
    name: "Developer test data",
    inReview: false,
    description: "Various test data for dev only.",
    datasets: [
      {
        name: "procedural uint8",
        loadParams: {
          imageUrl: "",
          rawData: v0.data,
          rawDims: v0.metadata,
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "procedural uint16",
        loadParams: {
          imageUrl: "",
          rawData: v1.data,
          rawDims: v1.metadata,
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "procedural float32",
        loadParams: {
          imageUrl: "",
          rawData: v2.data,
          rawDims: v2.metadata,
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "CellPainting",
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
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Test pick",
        loadParams: {
          imageUrl: {
            scenes: [
              [
                "https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/seg.ome.zarr",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "OME TIFF variance",
        loadParams: {
          imageUrl: {
            scenes: [["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/AICS-12_881.ome.tif"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },

      {
        name: "Time series mitosis zarr",
        loadParams: {
          imageUrl: {
            scenes: [["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/timelapse/timeseries_mitosis.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },

      {
        name: "Zarr EMT (internal)",
        loadParams: {
          imageUrl: {
            scenes: [
              [
                "https://dev-aics-dtp-001.int.allencell.org/users/danielt/3500005818_20230811__20x_Timelapse-02(P27-E7).ome.zarr",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },

      {
        name: "Zarr IDR 1",
        loadParams: {
          imageUrl: {
            scenes: [["https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0076A/10501752.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr IDR 2",
        loadParams: {
          imageUrl: {
            scenes: [["https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0054A/5025553.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr Variance 2-scene",
        loadParams: {
          imageUrl: {
            scenes: [
              ["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/1.zarr"],
              ["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/2.zarr"],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr Nucmorph 0",
        loadParams: {
          imageUrl: {
            scenes: [["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P13-C4.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr Nucmorph 1",
        loadParams: {
          imageUrl: {
            scenes: [["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P15-C3.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr Nucmorph 2",
        loadParams: {
          imageUrl: {
            scenes: [["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P7-B4.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr Nucmorph 3",
        loadParams: {
          imageUrl: {
            scenes: [["https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P8-B4.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr fly brain",
        loadParams: {
          imageUrl: {
            scenes: [["https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0048A/9846152.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "Zarr UK",
        loadParams: {
          imageUrl: {
            scenes: [["https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr"]],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "CFE Json",
        loadParams: {
          imageUrl: {
            scenes: [
              [
                "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-61/AICS-61_139803_atlas.json",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
      {
        name: "ABM tiff",
        loadParams: {
          imageUrl: {
            scenes: [
              [
                "https://animatedcell-test-data.s3.us-west-2.amazonaws.com/HAMILTONIAN_TERM_FOV_VSAHJUP_0000_000192.ome.tif",
              ],
            ],
          },
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...testDataBaseViewerSettings,
        },
      },
    ],
  },
];
