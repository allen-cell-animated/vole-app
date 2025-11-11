import React from "react";
import Icon from "@ant-design/icons";
import { IconComponentProps } from "@ant-design/icons/lib/components/Icon";

import ICONS from "../../assets/icons";

const STYLE = { fontSize: "19px" };
type ViewerIconProps = { type: keyof typeof ICONS } & Omit<IconComponentProps, "type" | "component" | "ref">;

/** Wrapper component for easy inclusion of our own custom icons. */
const ViewerIcon: React.FC<ViewerIconProps> = (props) => {
  const newProps = { ...props };
  newProps.style = { ...STYLE, ...props.style };
  return <Icon component={ICONS[props.type]} {...newProps} />;
};

export default ViewerIcon;
