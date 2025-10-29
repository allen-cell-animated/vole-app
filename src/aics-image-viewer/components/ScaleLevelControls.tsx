import { VolumeDims } from "@aics/vole-core/es/types/VolumeDims";
import React from "react";

export type ScaleLevelControlsProps = {
  volumeDims: VolumeDims[];
};

const ScaleLevelControls: React.FC<ScaleLevelControlsProps> = (props) => {
  return (
    <ul>
      {props.volumeDims.map(({ shape: [t, c, z, y, x] }, index) => (
        <li key={index}>{`level ${index}: ${t} T, ${c} C, ${x}x${y}x${z}`}</li>
      ))}
    </ul>
  );
};

export default ScaleLevelControls;
