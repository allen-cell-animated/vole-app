# Vol-E App URL Specification

When used as a standalone app, Vol-E allows you to optionally specify view
settings via query parameters in the URL. This document provides an overview of
the parameter specification.

You can include none or all of these parameters in the URL. If a parameter is
not specified, the listed default value will be used instead.

If you are using our public build, set
[`https://volumeviewer.allencell.org/viewer`](https://volumeviewer.allencell.org/viewer)
as the base address. If you are running Vol-E locally, you can substitute this
for a `localhost` address.

## Common Examples

| Query Parameters                            | Description                                                                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?url={url}&c0=ven:1&c2=ven:1,clz:1&view=Z` | Enable the first volume channel (`c0=ven:1`), and enable the third channel with colorizing mode enabled (`c2=ven:1&clz:1`). View in XY / Z-slice mode (`view=Z`).     |
| `?url={url}&c0=ven:1,lut:v15:v180`          | Enables the volume of the first channel and ramp its opacity for volume intensity values from 0% at intensity 15 and 100% at intensity 180. (`c0=ven:1,lut:v15:v180`) |
| `?url={url}&reg=0:1,0:1,0.25:0.75,t=40`     | Clips along the Z-axis to the middle 50% of the volume (`reg=0:1,0:1,0.25:0.75`), and sets the time to frame 40 (`t=40`).                                             |

## Data source (`url`)

The `url` parameter specifies the HTTPS URL of one or more volume to be loaded.
Supported formats include OME-Zarr and OME-TIFF files.

Multiple volumes can be loaded by including commas between each URL, and will
appear in the viewer as a single volume with all channels appended. This
requires all volumes to have **some resolution/scale where the dimensions
match.** The viewer will throw an error if there is no match possible.

URLs containing special characters (`?`, `#`, `&`, or `,`) must be first encoded
using
[`encodeURIComponent`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent).

| Query Parameters                | Description                                                                  | Example                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `?url={url}`                    | Load a volume from the specified URL.                                        | `?url=https://example.com/data/example1.ome.zarr`                                            |
| `?url={url1},{url2},{url3},...` | Load multiple volumes from multiple URLs, appending their channels together. | `?url=https://example.com/data/example1.ome.zarr,https://example.com/data/example2.ome.zarr` |

## View settings

General global settings for the viewer.

| Query parameter | Description                                                                                                           | Expected values                                                                    | Default       | Example                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------- | ------------------------------- |
| `view`          | Initial view axis.                                                                                                    | `X`, `Y`, `Z`, or `3D`                                                             | `3D`          | `?view=Z`                       |
| `mode`          | Rendering mode to use.                                                                                                | `volumetric`, `maxproject`, or `pathtrace`                                         | `volumetric`  | `?mode=maxproject`              |
| `mask`          | The opacity of masked areas of the volume. Used to fade areas outside a segmentation, must be used with mask channel. | Number in range `[0, 100]`                                                         | `50`          | `?mask=75`                      |
| `axes`          | Whether to show the axes helper.                                                                                      | `1` (enabled) or `0` (disabled)                                                    | `0`           | `?axes=1`                       |
| `bb`            | Whether to show a wireframe bounding box around the volume.                                                           | `1` (enabled) or `0` (disabled)                                                    | `0`           | `?bb=1`                         |
| `bbcol`         | The color of the bounding box.                                                                                        | 6-digit hex color                                                                  | `ffffff`      | `?bbcol=ff0000`                 |
| `bgcol`         | The background color.                                                                                                 | 6-digit hex color                                                                  | `000000`      | `?bgcol=ababab`                 |
| `rot`           | Whether to autorotate the view, which will spin it slowly on the vertical axis. Only available in 3D view.            | `1` (enabled) or `0` (disabled)                                                    | `0`           | `?rot=1`                        |
| `bright`        | The brightness of the image.                                                                                          | Number in the range `[0, 100]`                                                     | `70`          | `?bright=80`                    |
| `dens`          | Density modifier for the volume. Higher densities make the volume appear more opaque.                                 | Number in the range `[0, 100]`                                                     | `50`          | `?dens=60`                      |
| `lvl`           | Low, medium, and high levels for image intensity adjustment                                                           | Three numbers in the range `[0, 255]` separated by commas                          | `35,140,255`  | `?lvl=0,128,255`                |
| `interp`        | Whether to enable interpolation.                                                                                      | `1` (enabled) or `0` (disabled)                                                    | `1`           | `?interp=0`                     |
| `reg`           | Subregions per axis (XYZ order).                                                                                      | Three `min:max` number pairs separated by commas in a `[0,1]` range, in XYZ order. | `0:1,0:1,0:1` | `?reg=0:0.5,0:0.5,0:0.5`        |
| `slice`         | Slice position along each axis to show if the view mode is set to `X`, `Y`, or `Z`.                                   | Three floats, separated by commas, in XYZ order.                                   | `0.5,0.5,0.5` | `?slice=0.5,0.5,0.5`            |
| `t`             | Frame number, for time-series volumes.                                                                                | Integer                                                                            | `0`           | `?t=10`                         |
| `cam`           | Camera transform settings, with one or more properties separated by commas.                                           | [_See 'Camera transform settings'_](#camera-transform-settings-cam)                |               | `?cam=pos:1:2:3,tar:4:5:6`      |
| `c{n}`          | Channel settings for channel index `n`, with one or more properties separated by commas.                              | [_See 'Channel settings'_](#channel-settings-cn)                                   |               | `?c0=iso:1&c2=ven:1,col:ff23cc` |

## Camera transform settings (`cam`)

The `cam` query parameter is used to set one or more properties of the initial camera
transform. Each property is a `key:value` property pair separated by **commas**.

For example, to set the camera position to `(1,2,3)` and the target position to
`(4,5,6)`, the following query parameter could be added to the URL:
`cam=pos:1:2:3,tar:4:5:6`

Note that the `pos`, `tar`, and `up` properties may have different defaults
depending on the initial `view` setting.

| Property | Description                                                                       | Expected values                                | Default (3D) | Default (Z / XY) | Default (Y / XZ) | Default (X / YZ) | Example          |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------- | ------------ | ---------------- | ---------------- | ---------------- | ---------------- |
| `pos`    | Camera position.                                                                  | Three floats separated by colons, in XYZ order | `0:0:5`      | `0:0:2`          | `0:2:0`          | `2:0:0`          | `?cam=pos:1:2:3` |
| `up`     | Camera up vector. Used to solve for camera rotation.                              | Three floats separated by colons, in XYZ order | `0:1:0`      | `0:1:0`          | `0:0:1`          | `0:0:1`          | `?cam=up:0:0:1`  |
| `tar`    | Camera target. From the starting `pos`, the camera will point towards the target. | Three floats separated by colons, in XYZ order | `0:0:0`      | `0:0:0`          | `0:0:0`          | `0:0:0`          | `?cam=tar:4:5:6` |

| Property | Description                                                                    | Expected values | Default | Example         |
| -------- | ------------------------------------------------------------------------------ | --------------- | ------- | --------------- |
| `ort`    | Scale factor for orthographic cameras.                                         | Number          | 0.5     | `?cam=ort:0.25` |
| `fov`    | Vertical field of view for perspective cameras, in degrees from top to bottom. | Number          | 20      | `?cam=fov:60`   |

## Channel Settings (`c{n}`)

Channel settings are specified per channel index, starting at 0. To set
properties for channel `n`, the query parameter is `c{n}`, with each `key:value`
property pair being separated by **commas**.

> For example, to override settings on channel index 2, the following query
> parameter would be added to the URL:
> `?c2=ven:1,clz:1,col:8da3c0,cps:0:0:1:163:0.5:1:255:1:1`. This example enables
> the volume and the colorize mode, sets the color to `#8da3c0`, and sets the
> control points for the transfer function.

| Property | Description                                                                               | Expected values                                                                                | Default                                | Example                             |
| -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------- |
| `ven`    | Whether the volume is enabled.                                                            | `1` (enabled) or `0` (disabled)                                                                | `0` (`1` for the first three channels) | `?c0=ven:1`                         |
| `sen`    | Whether the isosurface is enabled.                                                        | `1` (enabled) or `0` (disabled)                                                                | `0`                                    | `?c0=iso:1`                         |
| `isv`    | Isosurface value, the intensity value at which to generate the isosurface.                | Number in the range `[0, 255]`                                                                 | `128`                                  | `?c0=isv:195`                       |
| `col`    | Base channel color, applied to volumes and isosurfaces.                                   | 6-digit hex color                                                                              | (varies by index)                      | `?c0=col:af38c0`                    |
| `clz`    | Colorize, used for segmentations where each ID should be a different color.               | `1` (enabled) or `0` (disabled)                                                                | `0`                                    | `?c0=clz:1`                         |
| `cza`    | Colorize alpha, the opacity of the colorize effect.                                       | Number in the range `[0, 1]`                                                                   | `1.0`                                  | `?c0=cza:1.0`                       |
| `isa`    | Isosurface alpha, the opacity of the isosurface.                                          | Number in the range `[0, 1]`                                                                   | `1.0`                                  | `?c0=isa:1.0`                       |
| `cpe`    | Use and show the control points instead of the ramp on load.                              | `1` (enabled) or `0` (disabled)                                                                | `0`                                    | `?c0=cpe:1`                         |
| `cps`    | Control points for the transfer function. If provided, overrides the `lut` field.         | List of `bin_index:opacity:color` triplets, separated by a colon ([_see 'Binning'_](#binning)) | `0:0:ffffff:255:1:ffffff`              | `?c0=cps:0:0:ff0000:150:0.5:ffff00` |
| `rmp`    | Raw ramp values. If provided, overrides the `lut` field when calculating the ramp values. | Two float bin indices, formatted as `min:max` ([_see 'Binning'_](#binning))                    | `0:255`                                | `?c0=rmp:0:255`                     |
| `lut`    | Lookup table (LUT) to map from volume intensity values to opacity.                        | [_See 'Lookup Table'_](#lookup-table-lut)                                                      | `0:255`                                | `?c0=lut:0:255`                     |

### Binning

When loaded, each channel's raw intensity values are sorted into one of 256
bins, where the bin index `0` holds the minimum raw intensity value of the
channel and the bin index `255` holds the maximum raw intensity value. Like any
binned histogram, each bin can represent multiple values-- if there are more
than 256 intensities in the channel, values will be evenly distributed across
bins.

Certain properties like `cps` (control points), `rmp` (ramp), and `lut` (lookup
table) directly reference these bin indices.

![Screenshot of Volume Viewer with a volume in advanced mode. A histogram with
255 bins is visible, with a ramp increasing from 0 to 1 on the Y axis in the
span of 53 to 136 on the X axis.](./assets/example_histogram.png)

For example, the above control points are at bin indices `0`, `53`, `136`, and
`255`. Depending on the range of the channel's values, these may
represent different raw intensity pixel values.

| Min raw intensity | Max raw intensity | Bin `0` intensity | Bin `53` intensity | Bin `136` intensity | Bin `255` intensity |
| ----------------- | ----------------- | ----------------- | ------------------ | ------------------- | ------------------- |
| 0                 | 255               | 0                 | 53                 | 136                 | 255                 |
| 50                | 200               | 50                | 103                | 166                 | 200                 |
| 45                | 1000              | 45-48             | 244-247            | 555-558             | 997-1000            |

### Lookup Table (`lut`)

The `lut` property maps from volume intensity values to opacity, and is
represented by a `min:max` pair. Values between the `min` and `max` ramp
linearly from an opacity of `0` to `1`. The `min` and `max` can match any of the
following:

- Plain numbers are treated as bin indices, in a `[0, 255]` range.
- `v{n}` represents an image intensity value, where `n` is an integer.
- `p{n}` represents a percentile, where `n` is a percentile in the `[0, 100]` range.
- `m{n}` represents the volume's median intensity multiplied by `n / 100`.
- `autoij` in either the min or max fields will approximate the ["auto"
  algorithm from
  ImageJ](https://github.com/imagej/ImageJ/blob/7746fcb0f5744a7a7758244c5dcd2193459e6e0e/ij/plugin/frame/ContrastAdjuster.java#L816)
  to select the min and max.

Examples:

| `lut` value | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `0:255`     | Linear mapping from bin 0 to bin 255.                      |
| `v10:v200`  | Linear mapping from raw intensity 10 to raw intensity 200. |
| `0:p90`     | Linear mapping from bin 0 to the 90th percentile.          |
| `p10:p95`   | Linear mapping from the 10th percentile to the 95th.       |
| `m100:m150` | Linear mapping from the median to 1.5 times the median.    |
| `autoij:0`  | Uses the "auto" algorithm from ImageJ.                     |
