# Vol-E (Volume Explorer)

For the latest stable release, please visit https://allen-cell-animated.github.io/website-3d-cell-viewer-release/

This is a browser based volume viewer built with React and WebGL (Three.js).
Volume data is provided to the core 3d viewer via one of the following file formats:
* a url to a OME-ZARR image
* a url to a OME-TIFF file
* a json file containing dimensions and other metadata, and texture atlases (png files containing volume slices tiled across the 2d image). These texture atlases must be prepared in advance before loading into this viewer.


The volume shader itself is a heavily modified version of one that has distant origins in [Bisque](http://bioimage.ucsb.edu/bisque).

## to use
- `https://allen-cell-animated.github.io/website-3d-cell-viewer-release/?url=path/to/ZARR`
- for more url parameters, see `public/index.tsx`

or as React component:

- `npm install @aics/web-3d-viewer`
- import the app as `import { ImageViewerApp } from "@aics/web-3d-viewer"`
- send in props as is shown in public/index.jsx
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
docker build -t 3d-volume-viewer-image .
docker run --rm -p 9020:80 --name 3d-volume-viewer 3d-volume-viewer-image
```

This will create a new docker image called `3d-volume-viewer` and run it on port 9020. You can access the viewer by navigating to http://localhost:9020 in your browser.

To rebuild changes, run the above commands again. (The `--rm` flag will automatically delete the existing container when it is stopped.)
