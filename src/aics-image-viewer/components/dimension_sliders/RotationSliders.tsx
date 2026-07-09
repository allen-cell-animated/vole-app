import type { View3d } from "@aics/vole-core";
import { Button, Space } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";

import type { AxisName } from "../../shared/types";
import {
  applyMatrix,
  defaultOrientedCamera,
  getRotationAngles,
  rotationMatrix,
  useCameraCallback,
} from "../../shared/utils/camera";
import { select, useViewerState } from "../../state/store";

import { DimensionSliderRow } from "./SliderRows";

/** Convert an angle from degrees to radians */
const toRadians = (deg: number): number => deg * (Math.PI / 180);
/** Convert an angle from radians to degrees */
const toDegrees = (rad: number): number => rad * (180 / Math.PI);

export const RotationSliders: React.FC<{ view3d: View3d; disable: boolean }> = ({ view3d, disable }) => {
  const [rotation, setRotation] = useState(() => getRotationAngles(view3d.getCameraState()));
  const autorotate = useViewerState(select("autorotate"));
  const changeViewerSetting = useViewerState(select("changeViewerSetting"));

  // Set to `true` when user interacts with this component, `false` when they click on the canvas or start autorotate.
  // While `hasControlRef.current === true`, this component's state propagates *down* to `view3d`
  // While `hasControlRef.current === false`, `view3d`'s camera state is synced *up* to this component.
  // TODO are there any other events besides the above that cause the volume to rotate? Ideally this would be an event
  //   that `View3d` would let us track directly.
  const hasControlRef = useRef(false);

  const handleRotate = useCallback(
    (axis: AxisName, deg: number) => {
      hasControlRef.current = true;
      if (autorotate) {
        changeViewerSetting("autorotate", false);
      }
      setRotation((current) => ({ ...current, [axis]: toRadians(deg) }));
    },
    [autorotate, changeViewerSetting]
  );

  const handleJump = useCallback((x: number, y: number, z: number) => {
    hasControlRef.current = true;
    setRotation({ x, y, z });
  }, []);

  // Take away control when autorotate is enabled
  useEffect(() => {
    if (autorotate) {
      hasControlRef.current = false;
    }
  }, [autorotate]);

  const rotateCameraTo = useCameraCallback((state, rotation: { x: number; y: number; z: number }) => {
    const matrix = rotationMatrix(rotation.x, rotation.y, rotation.z);
    return applyMatrix(defaultOrientedCamera(state), matrix);
  }, view3d);

  // Sync down rotation state while this component is "in control."
  useEffect(() => {
    if (hasControlRef.current) {
      rotateCameraTo(rotation);
    }
  }, [rotateCameraTo, rotation]);

  // Set up event listeners on mount.
  useEffect(() => {
    // TODO this is *extremely brittle*: setting this clears away any other listener for render events.
    //   At time of writing, `setOnRenderCallback` appears not to be used anywhere else in either this package or
    //   vole-core, but that could change at any time.
    //   Ideally `View3d` would have an `addEventListener`/`removeEventListener` model.
    view3d.setOnRenderCallback(() => {
      if (!hasControlRef.current) {
        setRotation(getRotationAngles(view3d.getCameraState()));
      }
    });

    const clickListener = (): boolean => (hasControlRef.current = false);
    view3d.getDOMElement().addEventListener("mousedown", clickListener);
    return () => view3d.getDOMElement().removeEventListener("mousedown", clickListener);
  }, [view3d]);

  const createRotateSlider = (axis: AxisName): React.ReactNode => (
    <div key={`${axis}-rotate`} className={`slider-row slider-${axis}`}>
      <DimensionSliderRow
        label={axis.toUpperCase()}
        val={[toDegrees(rotation[axis])]}
        min={-180}
        max={180}
        hideMax={true}
        onSlide={([deg]) => handleRotate(axis, deg)}
        unitSymbol="°"
      />
    </div>
  );

  const jumpXMinus = useCallback(() => handleJump(0, -Math.PI / 2, 0), [handleJump]);
  const jumpXPlus = useCallback(() => handleJump(0, Math.PI / 2, 0), [handleJump]);
  const jumpYMinus = useCallback(() => handleJump(Math.PI / 2, 0, -Math.PI / 2), [handleJump]);
  const jumpYPlus = useCallback(() => handleJump(-Math.PI / 2, 0, -Math.PI / 2), [handleJump]);
  const jumpZMinus = useCallback(() => handleJump(Math.PI, 0, -Math.PI), [handleJump]);
  const jumpZPlus = useCallback(() => handleJump(0, 0, 0), [handleJump]);

  return (
    <div className="clip-sliders clip-sliders-2d">
      <span className="slider-group">
        <span className="slider-group-title">Rotate</span>
        {disable ? (
          <span className="axis-slider-container">
            <i>Unavailable in 2d mode</i>
          </span>
        ) : (
          <span className="slider-group-rows">
            {createRotateSlider("x")}
            {createRotateSlider("y")}
            {createRotateSlider("z")}
          </span>
        )}
      </span>
      {!disable && (
        <span className="slider-group">
          <span className="slider-group-title group-title-extra">Jump to</span>
          <span className="slider-group-rows">
            <Space.Compact>
              <Button onClick={jumpXMinus}>-X</Button>
              <Button onClick={jumpXPlus}>+X</Button>
              <Button onClick={jumpYMinus}>-Y</Button>
              <Button onClick={jumpYPlus}>+Y</Button>
              <Button onClick={jumpZMinus}>-Z</Button>
              <Button onClick={jumpZPlus}>+Z</Button>
            </Space.Compact>
          </span>
        </span>
      )}
    </div>
  );
};
