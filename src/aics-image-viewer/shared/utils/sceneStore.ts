import type {
  CreateLoaderOptions,
  LoadSpec,
  PerChannelCallback,
  PrefetchDirection,
  RawArrayLoaderOptions,
  Volume,
  VolumeLoaderContext,
} from "@aics/vole-core";
import { VolumeFileFormat } from "@aics/vole-core";
import type { ThreadableVolumeLoader } from "@aics/vole-core/es/types/loaders/IVolumeLoader";

export default class SceneStore {
  context: VolumeLoaderContext;
  loaders: (ThreadableVolumeLoader | undefined)[];
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
  private async getLoader(scene: number): Promise<ThreadableVolumeLoader> {
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

  public async loadScene(
    scene: number,
    image: Volume,
    loadSpec?: LoadSpec,
    onChannelLoaded?: PerChannelCallback
  ): Promise<void> {
    const loader = await this.getLoader(scene);
    const spec = loadSpec ?? image.loadSpecRequired;

    image.loader = loader;
    image.imageInfo.imageInfo = (await loader.createImageInfo(spec)).imageInfo;
    loader.loadVolumeData(image, spec, onChannelLoaded);
  }

  public async createVolume(scene: number, loadSpec: LoadSpec, onChannelLoaded?: PerChannelCallback): Promise<Volume> {
    const loader = await this.getLoader(scene);
    return loader.createVolume(loadSpec, onChannelLoaded);
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
}
