# Triple-Projection View Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a TRIPLE view mode to vole-app that shows three linked orthographic slices (XY, YZ, XZ) driven by the vole-core `feature/tri-proj-view` branch, with per-axis single-value sliders that stay in sync with canvas crosshair dragging.

**Architecture:** The new `ViewMode.tripleProj = "TRIPLE"` enum value is passed directly to `view3d.setCameraMode()`. Slider → canvas sync goes through the existing `axisClipUpdater` subscriber (updated to call `setTripleSliceIndex` instead of `setAxisClip` in triple mode). Canvas crosshair → slider sync is handled by a `tripleSliceCallback` registered once per image in `subscribeImageToState`.

**Tech Stack:** TypeScript, React, Zustand, Ant Design radio buttons, vole-core `View3d` API

**Spec:** `docs/superpowers/specs/2026-09-01-triple-projection-view-design.md`

## Global Constraints

- `ViewMode.tripleProj` value MUST be `"TRIPLE"` (all-caps) — vole-core's `VolumeDrawable.modeStringToAxis` does a case-sensitive uppercase key lookup; any other casing silently falls through to `Axis.NONE`
- Local vole-core at `/Users/danielt/src/AllenCell/vole-core` on branch `feature/tri-proj-view`
- TypeScript must compile cleanly after every task: `npm run typeCheck`
- Test suite: `npm test` (Jest)
- vole-core build command: `npm run transpileES && npm run build-types` (run inside vole-core repo)

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Switch `@aics/vole-core` dep to `file:../../AllenCell/vole-core` |
| `src/aics-image-viewer/shared/enums.ts` | Add `tripleProj = "TRIPLE"` to `ViewMode` |
| `src/aics-image-viewer/shared/types.ts` | Add `[ViewMode.tripleProj]: null` to `activeAxisMap` |
| `src/aics-image-viewer/shared/constants.ts` | Add `ViewMode.tripleProj` to both camera-default `Record<ViewMode, …>` maps |
| `src/aics-image-viewer/components/Toolbar/ViewModeRadioButtons.tsx` | Add `ViewMode.tripleProj` to the `viewModes` array |
| `src/aics-image-viewer/state/serialize.ts` | Add `[ViewMode.tripleProj]: "TRIPLE"` |
| `src/aics-image-viewer/state/deserialize.ts` | Add `TRIPLE: ViewMode.tripleProj` |
| `src/aics-image-viewer/components/dimension_sliders/AxisClipSliders.tsx` | Add triple-mode branch (three single-value sliders) |
| `src/aics-image-viewer/state/subscribers.ts` | `axisClipUpdater` early-exit + `setTripleSliceCallback` registration |

---

### Task 1: Build vole-core and wire up local dependency

**Files:**
- Modify: `package.json` (dependency string only)

**Interfaces:**
- Produces: `view3d.setTripleSliceIndex(axis: "x"|"y"|"z", index: number): void`
- Produces: `view3d.setTripleSliceCallback(cb: ((indices: { x: number, y: number, z: number }) => void) | null): void`
- Produces: `view3d.setCameraMode("TRIPLE")` routes to triple-slice rendering

- [ ] **Step 1: Build vole-core feature branch**

```bash
cd /Users/danielt/src/AllenCell/vole-core
npm run transpileES && npm run build-types
cd /Users/danielt/src/allen-cell-animated/vole-app
```

Expected: build completes without errors.

- [ ] **Step 2: Update package.json to use local vole-core**

In `package.json`, change the `@aics/vole-core` entry inside `"dependencies"`:

```json
"@aics/vole-core": "file:../../AllenCell/vole-core",
```

- [ ] **Step 3: Install the local dependency**

```bash
npm install
```

Expected: `node_modules/@aics/vole-core` is now a symlink or copy from the local repo; TypeScript types include `setTripleSliceIndex`, `setTripleSliceCallback`, etc.

- [ ] **Step 4: Verify type check still passes**

```bash
npm run typeCheck
```

Expected: zero errors. (The new API surface is additive; existing code is unchanged.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: switch vole-core to local feature/tri-proj-view branch"
```

---

### Task 2: Add ViewMode.tripleProj and fix exhaustive type checks

**Files:**
- Modify: `src/aics-image-viewer/shared/enums.ts`
- Modify: `src/aics-image-viewer/shared/types.ts`
- Modify: `src/aics-image-viewer/shared/constants.ts`

**Interfaces:**
- Produces: `ViewMode.tripleProj` — value `"TRIPLE"`, imported wherever `ViewMode` is used
- Produces: `activeAxisMap[ViewMode.tripleProj]` returns `null`
- Produces: `getDefaultCameraState(ViewMode.tripleProj)` returns a valid `CameraState`

- [ ] **Step 1: Add tripleProj to the ViewMode enum**

In `src/aics-image-viewer/shared/enums.ts`, add the new member after `yz`:

```ts
export enum ViewMode {
  threeD = "3D",
  xy = "XY",
  xz = "XZ",
  yz = "YZ",
  tripleProj = "TRIPLE",
}
```

- [ ] **Step 2: Add tripleProj to activeAxisMap**

In `src/aics-image-viewer/shared/types.ts`, the `activeAxisMap` object is typed as `{ [A in ViewMode]: AxisName | null }` — TypeScript requires every ViewMode member to have an entry. Add the new one:

```ts
export const activeAxisMap: { [A in ViewMode]: AxisName | null } = {
  [ViewMode.yz]: "x",
  [ViewMode.xz]: "y",
  [ViewMode.xy]: "z",
  [ViewMode.threeD]: null,
  [ViewMode.tripleProj]: null,
};
```

- [ ] **Step 3: Add tripleProj to the two camera-default Record maps**

In `src/aics-image-viewer/shared/constants.ts`, both `viewModeToDefaultCameraPosition` and `viewModeToDefaultCameraUp` are `Record<ViewMode, [number, number, number]>` — exhaustive:

```ts
const viewModeToDefaultCameraPosition: Record<ViewMode, [number, number, number]> = {
  [ViewMode.threeD]: [0, 0, 5],
  [ViewMode.xy]: [0, 0, 2],
  [ViewMode.xz]: [0, 2, 0],
  [ViewMode.yz]: [2, 0, 0],
  [ViewMode.tripleProj]: [0, 0, 2],
};

const viewModeToDefaultCameraUp: Record<ViewMode, [number, number, number]> = {
  [ViewMode.threeD]: [0, 1, 0],
  [ViewMode.xy]: [0, 1, 0],
  [ViewMode.xz]: [0, 0, 1],
  [ViewMode.yz]: [0, 0, 1],
  [ViewMode.tripleProj]: [0, 1, 0],
};
```

- [ ] **Step 4: Verify type check**

```bash
npm run typeCheck
```

Expected: zero errors. At this point, several files that have `Record<ViewMode, …>` or exhaustive mapped types would error if you missed an entry — the typecheck is the test here.

- [ ] **Step 5: Commit**

```bash
git add src/aics-image-viewer/shared/enums.ts \
        src/aics-image-viewer/shared/types.ts \
        src/aics-image-viewer/shared/constants.ts
git commit -m "feat: add ViewMode.tripleProj enum value and fix exhaustive type maps"
```

---

### Task 3: Wire up the TRIPLE button and URL serialization

**Files:**
- Modify: `src/aics-image-viewer/components/Toolbar/ViewModeRadioButtons.tsx`
- Modify: `src/aics-image-viewer/state/serialize.ts`
- Modify: `src/aics-image-viewer/state/deserialize.ts`
- Test: `src/aics-image-viewer/state/test/deserialize.test.ts` (existing "handles all ViewMode values" test covers this automatically)

**Interfaces:**
- Consumes: `ViewMode.tripleProj` from Task 2
- Produces: "TRIPLE" button in toolbar ViewMode radio group
- Produces: `?view=TRIPLE` URL param serializes/deserializes to `ViewMode.tripleProj`

- [ ] **Step 1: Add TRIPLE to the radio button group**

In `src/aics-image-viewer/components/Toolbar/ViewModeRadioButtons.tsx`, add `ViewMode.tripleProj` to the `viewModes` array:

```ts
const viewModes = [ViewMode.threeD, ViewMode.xy, ViewMode.xz, ViewMode.yz, ViewMode.tripleProj];
```

- [ ] **Step 2: Add TRIPLE to the serialization map**

In `src/aics-image-viewer/state/serialize.ts`, find `viewModeToViewParam` and add the new entry:

```ts
const viewModeToViewParam = {
  [ViewMode.threeD]: "3D",
  [ViewMode.xy]: "Z",
  [ViewMode.xz]: "Y",
  [ViewMode.yz]: "X",
  [ViewMode.tripleProj]: "TRIPLE",
};
```

- [ ] **Step 3: Add TRIPLE to the deserialization map**

In `src/aics-image-viewer/state/deserialize.ts`, find the `viewParamToViewMode` object and extend both the object and the `allowedViews` type annotation:

```ts
const viewParamToViewMode = {
  "3D": ViewMode.threeD,
  Z: ViewMode.xy,
  Y: ViewMode.xz,
  X: ViewMode.yz,
  TRIPLE: ViewMode.tripleProj,
};
const allowedViews = Object.keys(viewParamToViewMode);
let view: "3D" | "X" | "Y" | "Z" | "TRIPLE";
if (allowedViews.includes(params.view.toUpperCase())) {
  view = params.view.toUpperCase() as "3D" | "X" | "Y" | "Z" | "TRIPLE";
} else {
  view = "3D";
}
result.viewMode = viewParamToViewMode[view];
```

- [ ] **Step 4: Run the existing serialize/deserialize tests**

```bash
npm test -- --testPathPattern="state/test/deserialize"
```

Expected: all pass, including "handles all ViewMode values" which now also exercises `ViewMode.tripleProj`.

- [ ] **Step 5: Verify type check**

```bash
npm run typeCheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/aics-image-viewer/components/Toolbar/ViewModeRadioButtons.tsx \
        src/aics-image-viewer/state/serialize.ts \
        src/aics-image-viewer/state/deserialize.ts
git commit -m "feat: add TRIPLE view mode button and URL serialize/deserialize"
```

---

### Task 4: AxisClipSliders — three single-value sliders in triple mode

**Files:**
- Modify: `src/aics-image-viewer/components/dimension_sliders/AxisClipSliders.tsx`

**Interfaces:**
- Consumes: `ViewMode.tripleProj` from Task 2
- Consumes: existing `create2dAxisSlider(axis: AxisName)` helper (already in this file)
- Produces: three per-axis single-value slice sliders when `props.mode === ViewMode.tripleProj`

**Background:** `activeAxisMap[ViewMode.tripleProj]` is `null` (same as `ViewMode.threeD`), so without this task the triple mode would incorrectly render 3D range sliders.

- [ ] **Step 1: Add the triple-mode branch to AxisClipSliders**

The file currently renders sliders like this (at the JSX return):

```tsx
<div className={activeAxis ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
  <span className="slider-group">
    <span className="slider-group-title">ROI</span>
    <span className="slider-group-rows">
      {activeAxis ? create2dAxisSlider(activeAxis) : AXES.map(create3dAxisSlider)}
    </span>
  </span>
```

Change it to:

```tsx
const isTripleMode = props.mode === ViewMode.tripleProj;
```

Add this line just after the existing `const activeAxis = activeAxisMap[props.mode];` line.

Then update the wrapper class and the slider rows:

```tsx
<div className={(activeAxis || isTripleMode) ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
  <span className="slider-group">
    <span className="slider-group-title">ROI</span>
    <span className="slider-group-rows">
      {isTripleMode
        ? AXES.map(create2dAxisSlider)
        : activeAxis
        ? create2dAxisSlider(activeAxis)
        : AXES.map(create3dAxisSlider)}
    </span>
  </span>
```

Also add the `ViewMode` import to this file (it currently imports `type ViewMode` from enums):

```ts
import { ViewMode } from "../../shared/enums";
```

(Change `type ViewMode` to just `ViewMode` so the value is available at runtime for the `===` comparison.)

- [ ] **Step 2: Verify type check**

```bash
npm run typeCheck
```

Expected: zero errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/aics-image-viewer/components/dimension_sliders/AxisClipSliders.tsx
git commit -m "feat: show three single-value slice sliders in triple projection mode"
```

---

### Task 5: Subscribers — drive vole-core from state and sync crosshair drag back

**Files:**
- Modify: `src/aics-image-viewer/state/subscribers.ts`

**Interfaces:**
- Consumes: `ViewMode.tripleProj` from Task 2
- Consumes: `view3d.setTripleSliceIndex(axis: "x"|"y"|"z", index: number): void` — sets the integer slice position for one axis in triple mode
- Consumes: `view3d.setTripleSliceCallback(cb: ((indices: Vector3) => void) | null): void` — registers/clears the crosshair-drag callback
- Consumes: `image.imageInfo.volumeSize: Vector3` — `.x`, `.y`, `.z` are integer voxel counts
- Consumes: `store.getState().changeViewerSetting("slice", partialPerAxis)` — updates normalized slice positions in state

**Data flow (slider → canvas):**

When the user moves a slice slider:
1. `updateSlice(axis, val)` in `AxisClipSliders` calls `changeViewerSetting("slice", { [axis]: val / numSlices[axis] })`
2. The Zustand subscriber `selectAxisClipUpdateInfo(axis)` fires the `axisClipUpdater` for that axis
3. `axisClipUpdater` detects triple mode and calls `view3d.setTripleSliceIndex(axis, Math.round(slice * volumeSize[axis]))`
4. vole-core redraws the canvas with the updated crosshair position

**Data flow (canvas → sliders):**

When the user drags a crosshair:
1. vole-core fires the registered callback with a `Vector3` of integer indices
2. The callback converts to normalized [0,1] values and calls `changeViewerSetting("slice", { x, y, z })`
3. React re-renders the three sliders with new positions
4. The `axisClipUpdater` subscriber fires for each axis and calls `setTripleSliceIndex` with the same value — benign no-op

There is no infinite loop: vole-core fires the callback only on mouse-drag events, never in response to `setTripleSliceIndex` calls.

- [ ] **Step 1: Update `axisClipUpdater` to handle triple mode**

In `src/aics-image-viewer/state/subscribers.ts`, find the `axisClipUpdater` function body. It currently starts with an `if (viewMode === ViewMode.threeD)` block. Add a triple-mode early-exit **before** that block:

```ts
const axisClipUpdater = (axis: AxisName) => {
  return ({ region: [minval, maxval], slice, viewMode }: AxisClipUpdateInfo) => {
    if (viewMode === ViewMode.tripleProj) {
      const index = Math.round(slice * image.imageInfo.volumeSize[axis]);
      view3d.setTripleSliceIndex(axis, index);
      return;
    }
    if (viewMode === ViewMode.threeD) {
      // ... rest of existing code unchanged ...
```

- [ ] **Step 2: Register the triple-slice callback in `subscribeImageToState`**

Find where `subscribeImageToState` builds the `unsubscribers` array. Just **before** the `const unsubscribers = [` line, add the callback registration:

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

- [ ] **Step 3: Clear the callback in the teardown function**

Find the `return () => unsubscribers.forEach(...)` at the end of `subscribeImageToState` and update it:

```ts
return () => {
  view3d.setTripleSliceCallback(null);
  unsubscribers.forEach((unsubscribe) => unsubscribe());
};
```

- [ ] **Step 4: Verify type check**

```bash
npm run typeCheck
```

Expected: zero errors. If TypeScript complains that `view3d` does not have `setTripleSliceIndex` or `setTripleSliceCallback`, the vole-core build from Task 1 did not succeed — re-run Task 1.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/aics-image-viewer/state/subscribers.ts
git commit -m "feat: sync triple-slice indices between state and vole-core canvas"
```

---

### Task 6: Final integration verification

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

```bash
npm run typeCheck
```

Expected: zero errors.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 3: Manual smoke test**

Start the dev server and verify the following:

```bash
npm run dev
```

1. Load any image. The toolbar shows five buttons: 3D, XY, XZ, YZ, TRIPLE.
2. Click TRIPLE. The canvas switches to a three-pane orthographic view (XY bottom-left, YZ bottom-right, XZ top-left).
3. The bottom panel shows three single-value ROI sliders (X, Y, Z).
4. Drag a crosshair in the canvas. All three sliders update.
5. Move the X slider. The corresponding crosshair moves in the canvas.
6. Switch back to 3D. The range-slider ROI controls return.
7. Switch to XY. A single z-axis slice slider appears.
8. Add `?view=TRIPLE` to the URL and reload. The viewer opens in triple mode.
