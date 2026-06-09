import type { View3d } from "@aics/vole-core";
import { Button } from "antd";
import React from "react";

import { ViewMode } from "../shared/enums";
import {
  applyMatrix,
  defaultOrientedCamera,
  getRotationAngles,
  rotationMatrix,
  useCameraCallback,
  useCameraJumpCallback,
} from "../shared/utils/camera";
import { select, useViewerState } from "../state/store";

import SliderRow from "./shared/SliderRow";

/** Convert an angle from degrees to radians */
export const toRadians = (deg: number): number => deg * (Math.PI / 180);
/** Convert an angle from radians to degrees */
export const toDegrees = (rad: number): number => rad * (180 / Math.PI);

const RotationSlider: React.FC<{
  label: string;
  angle: number;
  onChange: (delta: number) => void;
  disabled?: boolean;
}> = (props) => {
  const { label, angle, onChange, disabled } = props;

  const onUpdate = React.useCallback(([value]: number[]) => onChange(value), [onChange]);

  return (
    <SliderRow
      label={label}
      min={-180}
      max={180}
      start={angle}
      step={1}
      onSlide={onUpdate}
      disabled={disabled}
      formatInteger={true}
    />
  );
};

export type RotationControlsProps = { view3d: View3d };

const RotationControls: React.FC<RotationControlsProps> = ({ view3d }) => {
  const viewMode = useViewerState(select("viewMode"));
  const disable = viewMode !== ViewMode.threeD;

  const [rotation, setRotation] = React.useState(() => getRotationAngles(view3d.getCameraState()));

  const rotateCameraTo = useCameraCallback((state, rotation: { x: number; y: number; z: number }) => {
    const matrix = rotationMatrix(rotation.x, rotation.y, rotation.z);
    return applyMatrix(defaultOrientedCamera(state), matrix);
  }, view3d);

  const handleRotate = React.useCallback(
    (axis: "x" | "y" | "z", deg: number) => {
      rotation[axis] = toRadians(deg);
      setRotation(rotation);
      rotateCameraTo(rotation);
    },
    [rotation, rotateCameraTo]
  );

  const jumpXMinus = useCameraJumpCallback(view3d, "x", true, true);
  const jumpXPlus = useCameraJumpCallback(view3d, "x", false, true);
  const jumpYMinus = useCameraJumpCallback(view3d, "y", true);
  const jumpYPlus = useCameraJumpCallback(view3d, "y", false);
  const jumpZMinus = useCameraJumpCallback(view3d, "z", true, true);
  const jumpZPlus = useCameraJumpCallback(view3d, "z", false, true);

  return (
    <div style={{ padding: "18px 16px 22px" }}>
      <SliderRow label="jump to">
        <Button.Group style={{ width: "100%", justifyContent: "center" }}>
          <Button onClick={jumpXMinus} disabled={disable}>
            -X
          </Button>
          <Button onClick={jumpXPlus} disabled={disable}>
            +X
          </Button>
          <Button onClick={jumpYMinus} disabled={disable}>
            -Y
          </Button>
          <Button onClick={jumpYPlus} disabled={disable}>
            +Y
          </Button>
          <Button onClick={jumpZMinus} disabled={disable}>
            -Z
          </Button>
          <Button onClick={jumpZPlus} disabled={disable}>
            +Z
          </Button>
        </Button.Group>
      </SliderRow>
      <RotationSlider
        label="X"
        angle={toDegrees(rotation.x)}
        onChange={(deg) => handleRotate("x", deg)}
        disabled={disable}
      />
      <RotationSlider
        label="Y"
        angle={toDegrees(rotation.y)}
        onChange={(deg) => handleRotate("y", deg)}
        disabled={disable}
      />
      <RotationSlider
        label="Z"
        angle={toDegrees(rotation.z)}
        onChange={(deg) => handleRotate("z", deg)}
        disabled={disable}
      />
      <Button onClick={() => console.log(getRotationAngles(view3d.getCameraState()))} />
    </div>
  );
};

export default RotationControls;
