# Vol-E App

Volume Explorer (Vol-E) is a browser based volume viewer built with React and WebGL (Three.js). This package wraps the [vole-core](https://github.com/allen-cell-animated/volume-viewer) library.

For the latest stable release, please visit https://allen-cell-animated.github.io/website-3d-cell-viewer-release/

Volume data is provided to the core 3d viewer via one of the following file formats:

- a url to a OME-ZARR image
- a url to a OME-TIFF file
- a json file containing dimensions and other metadata, and texture atlases (png files containing volume slices tiled across the 2d image). These texture atlases must be prepared in advance before loading into this viewer.

The volume shader itself is a heavily modified version of one that has distant origins in [Bisque](http://bioimage.ucsb.edu/bisque).

## to use

- `https://allen-cell-animated.github.io/website-3d-cell-viewer-release/?url=path/to/ZARR`
- for more url parameters, see [`website\utils\url_utils.ts#L82`](website\utils\url_utils.ts#L82)

or as React component:

- `npm install @aics/vole-app`
- import the app as `import { ImageViewerApp } from "@aics/vole-app"`
- send in props as is shown in [`public/index.jsx`](public/index.tsx)

```
    <ImageViewerApp
        baseUrl="http://dev-aics-dtp-001.corp.alleninstitute.org/cellviewer-1-4-0/Cell-Viewer_Thumbnails/"
        cellPath="AICS-17/AICS-17_4187_23618_atlas.json"
        ... (also see src/aics-image-viewer/components/App/types.ts for full props specification) ...
    />
```

### Running with Docker

Clone the repository and run the following commands in the root of the project:

```cmd
docker build -t vole-app-image .
docker run --rm -p 9020:80 --name vole-app vole-app-image
```

This will create a new docker image called `vole-app` and run it on port 9020. You can access the viewer by navigating to http://localhost:9020 in your browser.

To rebuild changes, run the above commands again. (The `--rm` flag will automatically delete the existing container when it is stopped.)
