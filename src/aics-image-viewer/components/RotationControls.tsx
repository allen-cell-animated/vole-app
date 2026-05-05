import type { View3d } from "@aics/vole-core";
import React from "react";

import SliderRow from "./shared/SliderRow";

export type RotationControlsProps = {
  view3d: View3d;
};

const RotationControls: React.FC<RotationControlsProps> = ({ view3d }) => {
  return <SliderRow label="test" />;
};

export default RotationControls;
