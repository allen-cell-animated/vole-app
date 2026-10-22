import type {
  CreateLoaderOptions,
  LoadSpec,
  PrefetchDirection,
  RawArrayLoaderOptions,
  VolumeLoader,
  VolumeLoaderContext,
  ZarrLoaderFetchOptions,
} from "@aics/vole-core";
import { Volume, VolumeFileFormat } from "@aics/vole-core";

export type LoadSceneOptions = {
  onCreateScene?: (volume: Volume, sceneIndex: number, loadSpec: LoadSpec) => void;
  onChannelLoaded?: (volume: Volume, channelIndex: number) => void;
};

export default class SceneStore {
  context: VolumeLoaderContext;
  loaders: (VolumeLoader | undefined)[];
  paths: (string | string[] | RawArrayLoaderOptions)[];
  currentScene: number = 0;
  syncChannels: boolean = false;
  prefetchPriority: PrefetchDirection[] = [];

  constructor(context: VolumeLoaderContext, paths: (string | string[] | RawArrayLoaderOptions)[]) {
    this.paths = paths;
    this.context = context;
    this.loaders = new Array(paths.length).fill(undefined);
  }

  /** Get the loader associated with the given scene index, or create it if it doesn't exist */
  private async getLoader(scene: number): Promise<VolumeLoader> {
    this.currentScene = scene;
    let loader = this.loaders[scene];

    if (!loader) {
      let path = this.paths[scene];
      let options: Partial<CreateLoaderOptions> = {};
      if (typeof path === "object" && !Array.isArray(path)) {
        options.rawArrayOptions = path;
        options.fileType = VolumeFileFormat.DATA;
        path = "";
      }

      await this.context.onOpen();
      loader = await this.context.createLoader(path, options);
      this.loaders[scene] = loader;
    }

    loader.syncMultichannelLoading(this.syncChannels);
    loader.setPrefetchPriority(this.prefetchPriority);
    return loader;
  }

  public async loadScene(scene: number, image: Volume, loadSpec?: LoadSpec, options?: LoadSceneOptions): Promise<void> {
    const loader = await this.getLoader(scene);
    image.setLoader(loader, loadSpec);
    options?.onCreateScene?.(image, scene, image.loadSpec);
    image.load();
  }

  public async createVolume(scene: number): Promise<Volume> {
    const loader = await this.getLoader(scene);
    const result = new Volume(loader);
    result.load();
    return result;
  }

  public syncMultichannelLoading(sync: boolean): void {
    this.syncChannels = sync;
    const currentLoader = this.loaders[this.currentScene];
    if (currentLoader) {
      currentLoader.syncMultichannelLoading(sync);
    }
  }

  public setPrefetchPriority(priority: PrefetchDirection[]): void {
    this.prefetchPriority = priority;
    const currentLoader = this.loaders[this.currentScene];
    if (currentLoader) {
      currentLoader.setPrefetchPriority(priority);
    }
  }

  public updateFetchOptions(fetchOptions: Partial<ZarrLoaderFetchOptions>): void {
    const currentLoader = this.loaders[this.currentScene];
    if (currentLoader) {
      currentLoader.updateFetchOptions(fetchOptions);
    }
  }
}
