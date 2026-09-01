# Triple-Projection View Mode — Design Spec

**Date:** 2026-09-01  
**Branch:** `feature/tri-proj-view`  
**vole-core dependency:** local `feature/tri-proj-view` branch (`/Users/danielt/src/AllenCell/vole-core`)

---

## Overview

Add a "TRIPLE" view mode to vole-app that shows three linked orthographic slices (XY, YZ, XZ) side-by-side in the vole-core canvas. The user can drag crosshairs in the canvas to change the slice positions, or use per-axis single-value sliders in the bottom panel. All three slice positions are kept in sync between the canvas crosshairs and the UI sliders.

---

## vole-core API (feature/tri-proj-view branch)

The following new API surface is used:

| Method | Purpose |
|--------|---------|
| `view3d.setCameraMode("TRIPLE")` | Switch to triple-slice rendering |
| `view3d.setTripleSliceIndex(axis: AxisName, index: number)` | Set the slice index for one axis (integer, 0-based) |
| `view3d.getTripleSliceIndices(): Vector3 \| undefined` | Get current indices snapshot |
| `view3d.setTripleSliceCallback(cb: (indices: Vector3) => void)` | Register callback fired when user drags crosshairs |
| `view3d.setTripleSliceCallback(null)` | Clear the callback |

`AxisName` is `"x" | "y" | "z"`. The `Vector3` indices are integer slice numbers (0-based), not normalized.

**Important:** `setCameraMode` passes the mode string directly to `VolumeDrawable.modeStringToAxis`, which does a case-sensitive uppercase lookup. The mode string **must** be `"TRIPLE"` (all-caps). The existing subscribers pass `viewMode` directly to `setCameraMode`, so `ViewMode.tripleProj` must equal `"TRIPLE"`.

---

## Architecture

### Data flow: slider → canvas

1. User moves a slice slider → `updateSlice(axis, val)` in `AxisClipSliders`
2. → `changeViewerSetting("slice", { [axis]: val / numSlices[axis] })` (normalized 0–1)
3. → State update triggers `axisClipUpdater(axis)` subscriber
4. → Subscriber calls `view3d.setTripleSliceIndex(axis, Math.round(slice * volumeSize[axis]))`
5. → vole-core redraws canvas with updated crosshair position

### Data flow: canvas crosshair drag → slider

1. User drags crosshair in vole-core canvas
2. → vole-core fires `tripleSliceCallback(indices: Vector3)` with all three new indices
3. → Callback (registered in `subscribeImageToState`) calls `changeViewerSetting("slice", { x, y, z })` with normalized values
4. → State update triggers sliders to re-render with new positions
5. → `axisClipUpdater` fires for each axis and calls `setTripleSliceIndex` with the same values — benign no-op, no feedback loop

The callback only fires on mouse-drag events inside vole-core, never in response to `setTripleSliceIndex` calls, so there is no infinite loop.

---

## Files to Change

### 1. `package.json`

Change the vole-core dependency from npm to the local feature branch:

```json
"@aics/vole-core": "file:../../AllenCell/vole-core"
```

**Prerequisite:** build the vole-core branch first (`npm run build` in `/Users/danielt/src/AllenCell/vole-core`), then run `npm install` in vole-app.

### 2. `src/aics-image-viewer/shared/enums.ts`

Add to the `ViewMode` enum:

```ts
tripleProj = "TRIPLE",
```

Value must be `"TRIPLE"` (all-caps) for vole-core compatibility. Button label will display "TRIPLE", consistent with other all-caps mode names (3D, XY, XZ, YZ).

### 3. `src/aics-image-viewer/shared/types.ts`

Add to `activeAxisMap` (required by TypeScript's exhaustive mapped-type check):

```ts
[ViewMode.tripleProj]: null,
```

Triple mode has no single "active" axis (all three are shown); `null` here tells `AxisClipSliders` to branch on mode separately.

### 4. `src/aics-image-viewer/shared/constants.ts`

Both camera-default maps are `Record<ViewMode, …>` — TypeScript requires entries for every enum member.

In `viewModeToDefaultCameraPosition`:
```ts
[ViewMode.tripleProj]: [0, 0, 2],
```

In `viewModeToDefaultCameraUp`:
```ts
[ViewMode.tripleProj]: [0, 1, 0],
```

These match the XY orthographic defaults; the triple-slice camera is managed by vole-core and the stored values are mostly ignored, but valid entries are required.

### 5. `src/aics-image-viewer/components/Toolbar/ViewModeRadioButtons.tsx`

Add `ViewMode.tripleProj` to the `viewModes` array:

```ts
const viewModes = [ViewMode.threeD, ViewMode.xy, ViewMode.xz, ViewMode.yz, ViewMode.tripleProj];
```

### 6. `src/aics-image-viewer/components/dimension_sliders/AxisClipSliders.tsx`

Replace the current two-branch conditional with three branches:

- **Triple mode**: render `AXES.map(create2dAxisSlider)` — three single-value slice sliders
- **Single-axis 2D mode**: existing `create2dAxisSlider(activeAxis)` (unchanged)
- **3D mode**: existing `AXES.map(create3dAxisSlider)` (unchanged)

The wrapper div class gains `clip-sliders-2d` for triple mode (same as single-axis 2D) since we're showing single-value sliders.

```tsx
const isTripleMode = props.mode === ViewMode.tripleProj;
const activeAxis = activeAxisMap[props.mode];

// In JSX:
<div className={(activeAxis || isTripleMode) ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
  ...
  {isTripleMode
    ? AXES.map(create2dAxisSlider)
    : activeAxis
    ? create2dAxisSlider(activeAxis)
    : AXES.map(create3dAxisSlider)}
```

No changes to `updateSlice` or `create2dAxisSlider` — they work as-is for triple mode.

### 7. `src/aics-image-viewer/state/subscribers.ts`

**Two changes inside `subscribeImageToState`:**

**a) `axisClipUpdater` — early-exit for triple mode:**

```ts
if (viewMode === ViewMode.tripleProj) {
  const index = Math.round(slice * image.imageInfo.volumeSize[axis]);
  view3d.setTripleSliceIndex(axis, index);
  return;
}
// ... existing setAxisClip logic unchanged
```

This replaces volume-clip behavior (irrelevant in triple mode) with the correct triple-slice index update.

**b) Register triple-slice callback at image setup time:**

```ts
view3d.setTripleSliceCallback((indices) => {
  const { x, y, z } = image.imageInfo.volumeSize;
  store.getState().changeViewerSetting("slice", {
    x: indices.x / x,
    y: indices.y / y,
    z: indices.z / z,
  });
});
```

Clean up in the returned teardown function:

```ts
return () => {
  view3d.setTripleSliceCallback(null);
  unsubscribers.forEach((u) => u());
};
```

The callback is safe to register even when not in triple mode — vole-core guarantees it only fires during triple-slice rendering.

### 8. `src/aics-image-viewer/state/serialize.ts`

Add to `viewModeToViewParam`:

```ts
[ViewMode.tripleProj]: "TRIPLE",
```

### 9. `src/aics-image-viewer/state/deserialize.ts`

Add to the existing `viewModeMap` / mode-string-to-enum mapping:

```ts
TRIPLE: ViewMode.tripleProj,
```

---

## Files NOT changed

| File | Reason |
|------|--------|
| `state/util.ts` | Path-trace guard `viewMode !== ViewMode.threeD` already blocks tripleProj |
| `state/reset.ts` | The `ViewMode.xy`-specific z-slice camera-reset logic only runs on the `setZSlice` path, which doesn't execute in triple mode |
| `CellViewerCanvasWrapper/index.tsx` | `AxisClipSliders` is already wired; `clippingPanelTall` calculation uses `ViewMode.threeD` check, which still works |
| `RotationSliders` | Disabled when not in 3D mode (existing condition: `viewMode !== ViewMode.threeD`) |

---

## Testing Considerations

- Switch from 3D → TRIPLE: canvas shows three panes, three single-value sliders appear in bottom panel
- Switch from TRIPLE → XY/XZ/YZ: single-axis mode works as before
- Drag crosshair in canvas → all three sliders update
- Move one slider → corresponding crosshair moves in canvas
- Switch to TRIPLE with a volume loaded → correct initial slice positions
- Load a new volume while in TRIPLE → callback is re-registered, sliders reflect new volume size
- Serialization round-trip: `?view=TRIPLE` in URL → loads in triple mode
