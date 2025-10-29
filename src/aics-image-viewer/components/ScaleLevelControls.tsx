import { VolumeDims } from "@aics/vole-core/es/types/VolumeDims";
import React from "react";

export type ScaleLevelControlsProps = {
  multiscaleDims: VolumeDims[];
  multiscaleLevel?: number;
};

const ScaleLevelControls: React.FC<ScaleLevelControlsProps> = (props) => {
  return (
    <ul>
      {props.multiscaleDims.map(({ shape: [t, c, z, y, x] }, index) => (
        <li style={index === props.multiscaleLevel ? { fontWeight: "bold" } : {}} key={index}>
          {`level ${index}: ${x}x${y}x${z}, ${t} timesteps, ${c} channels`}
        </li>
      ))}
    </ul>
  );
};

export default ScaleLevelControls;
