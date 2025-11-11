import type {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirebaseFirestore,
  QuerySnapshot,
} from "@firebase/firestore-types";

// TODO: These types are shared with Cell Feature Explorer. Can they be moved to
// a shared package?

export interface DatasetMetaData {
  name: string;
  version: string;
  datasets?: { [key: string]: DatasetMetaData };
  id: string;
  description: string;
  image: string;
  link?: string;
  manifest?: string;
  production?: boolean;
  userData: {
    isNew: boolean;
    inReview: boolean;
    totalTaggedStructures: number;
    totalCells: number;
    totalFOVs: number;
  };
}
export interface FileInfo {
  CellId: string;
  CellLineName: string;
  FOVId: string;
  structureProteinName: string;
  fovThumbnailPath: string;
  fovVolumeviewerPath: string;
  thumbnailPath: string;
  volumeviewerPath: string;
}

interface ManifestDocumentData extends DocumentData {
  featuresDataPath: string;
  cellLineDataPath: string;
  thumbnailRoot: string;
  downloadRoot: string;
  volumeViewerDataRoot: string;
  featuresDisplayOrder: string[];
  defaultXAxis: string;
  defaultYAxis: string;
  fileInfoPath: string;
  featuresDataOrder: string[];
  albumPath: string;
  featureDefsPath: string;
}

function isDevOrStagingSite(host: string): boolean {
  // first condition is for testing with no client
  return !host || host.includes("localhost") || host.includes("staging") || host.includes("stg");
}

class FirebaseRequest {
  private firestore: FirebaseFirestore;
  private fileInfoPath: string;

  // TODO: These properties are private and unused. Remove?
  private collectionRef: DocumentReference;
  private featuresDataPath: string;
  private cellLineDataPath: string;
  private thumbnailRoot: string;
  private downloadRoot: string;
  private volumeViewerDataRoot: string;
  private featuresDisplayOrder: string[];
  private datasetId: string;
  private featuresDataOrder: string[];
  private albumPath: string;
  private featureDefsPath: string;

  constructor(firestore: FirebaseFirestore) {
    this.firestore = firestore;
    this.featuresDataPath = "";
    this.cellLineDataPath = "";
    this.thumbnailRoot = "";
    this.downloadRoot = "";
    this.volumeViewerDataRoot = "";
    this.featuresDisplayOrder = [];
    this.fileInfoPath = "";
    this.datasetId = "";
    this.featuresDataOrder = [];
    this.albumPath = "";
    this.featureDefsPath = "";
    this.collectionRef = firestore.collection("cfe-datasets").doc("v1");
  }

  private getDoc = (docPath: string): Promise<DocumentSnapshot<DocumentData>> => {
    return this.firestore.doc(docPath).get();
  };

  public getAvailableDatasets = (): Promise<DatasetMetaData[]> => {
    return this.firestore
      .collection("dataset-descriptions")
      .get()
      .then((snapShot: QuerySnapshot) => {
        const datasets: DatasetMetaData[] = [];

        snapShot.forEach((doc) => {
          const metadata = doc.data() as DatasetMetaData;
          /** if running the site in a local development env or on staging.cfe.allencell.org
           * include all cards, otherwise, only include cards with a production flag.
           * this is based on hostname instead of a build time variable so we don't
           * need a separate build for staging and production
           */

          if (isDevOrStagingSite(location.hostname)) {
            datasets.push(metadata);
          } else if (metadata.production) {
            datasets.push(metadata);
          }
        });
        return datasets;
      });
  };

  public setCollectionRef = (id: string): void => {
    this.collectionRef = this.firestore.collection("cfe-datasets").doc(id);
  };

  private getManifest = (ref: string): Promise<ManifestDocumentData> => {
    return this.firestore
      .doc(ref)
      .get()
      .then((manifestDoc: DocumentData) => {
        return manifestDoc.data();
      });
  };

  public selectDataset = (ref: string): Promise<ManifestDocumentData> => {
    return this.getManifest(ref).then((data) => {
      this.featuresDataPath = data.featuresDataPath;
      this.thumbnailRoot = data.thumbnailRoot;
      this.downloadRoot = data.downloadRoot;
      this.volumeViewerDataRoot = data.volumeViewerDataRoot;
      this.featuresDisplayOrder = data.featuresDisplayOrder;
      this.cellLineDataPath = data.cellLineDataPath;
      this.fileInfoPath = data.fileInfoPath;
      this.featuresDataOrder = data.featuresDataOrder;
      this.featureDefsPath = data.featureDefsPath;
      this.albumPath = data.albumPath;
      return { ...data };
    });
  };

  public getFileInfoByCellId = (cellId: string): Promise<FileInfo | undefined> => {
    return this.getDoc(`${this.fileInfoPath}/${cellId}`).then((doc) => {
      const data = doc.data() as FileInfo;
      if (!data) {
        return;
      }
      return {
        ...data,
        CellId: data.CellId.toString(),
        FOVId: data.FOVId.toString(),
      };
    });
  };

  public getFileInfoByArrayOfCellIds = (cellIds: string[]): Promise<(FileInfo | undefined)[]> => {
    return Promise.all(
      cellIds.map((id: string) => {
        return this.getDoc(`${this.fileInfoPath}/${id}`).then((doc) => {
          const data = doc.data() as FileInfo;
          if (!data) {
            return;
          }
          return {
            ...data,
            CellId: data.CellId.toString(),
            FOVId: data.FOVId.toString(),
          };
        });
      })
    );
  };
}

export default FirebaseRequest;
