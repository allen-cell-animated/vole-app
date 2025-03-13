import { View3d, Volume } from "@aics/vole-core";
import { LoadingOutlined } from "@ant-design/icons";
import React from "react";

import { ViewMode } from "../../shared/enums";
import { AxisName, PerAxis, Styles } from "../../shared/types";
import PlayControls from "../../shared/utils/playControls";
import { ViewerSettingUpdater } from "../ViewerStateProvider/types";

import AxisClipSliders from "../AxisClipSliders";
import BottomPanel from "../BottomPanel";
import { connectToViewerState } from "../ViewerStateProvider";

import "./styles.css";

type ViewerWrapperProps = {
  // From parent
  view3d: View3d;
  loadingImage: boolean;
  appHeight: string;
  image: Volume | null;
  numSlices: PerAxis<number>;
  numSlicesLoaded: PerAxis<number>;
  playControls: PlayControls;
  playingAxis: AxisName | "t" | null;
  numTimesteps: number;
  visibleControls: {
    axisClipSliders: boolean;
  };
  onClippingPanelVisibleChange?: (panelOpen: boolean, hasTime: boolean) => void;
  onClippingPanelVisibleChangeEnd?: (panelOpen: boolean) => void;

  // From viewer state
  autorotate: boolean;
  viewMode: ViewMode;
  region: PerAxis<[number, number]>;
  slice: PerAxis<number>;
  time: number;
  changeViewerSetting: ViewerSettingUpdater;
};

const ViewerWrapper: React.FC<ViewerWrapperProps> = (props) => {
  const view3dviewerRef = React.createRef<HTMLDivElement>();

  React.useEffect(() => {
    view3dviewerRef.current!.appendChild(props.view3d.getDOMElement());
    props.view3d.setAutoRotate(props.autorotate);
  }, []);

  // TODO necessary?
  React.useEffect(() => {
    props.view3d.resize(null);
  });

  const renderOverlay = (): React.ReactNode => {
    // Don't show spinner during playback - we may be constantly loading new data, it'll block the view!
    const showSpinner = props.loadingImage && !props.playingAxis;
    const spinner = showSpinner ? (
      <div style={STYLES.noImage}>
        <LoadingOutlined style={{ fontSize: 60, zIndex: 1000 }} />
      </div>
    ) : null;

    const noImageText =
      !props.loadingImage && !props.image ? <div style={STYLES.noImage}>No image selected</div> : null;
    if (!!noImageText && props.view3d) {
      props.view3d.removeAllVolumes();
    }
    return noImageText || spinner;
  };

  const { appHeight, changeViewerSetting, visibleControls, numSlices, numTimesteps, viewMode, region, slice, time } =
    props;

  return (
    <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
      <div ref={view3dviewerRef} style={STYLES.view3d}></div>
      <BottomPanel
        title="Clipping"
        onVisibleChange={(visible) => props.onClippingPanelVisibleChange?.(visible, numTimesteps > 1)}
        onVisibleChangeEnd={props.onClippingPanelVisibleChangeEnd}
      >
        {visibleControls.axisClipSliders && !!props.image && (
          <AxisClipSliders
            mode={viewMode}
            image={props.image}
            changeViewerSetting={changeViewerSetting}
            numSlices={numSlices}
            numSlicesLoaded={props.numSlicesLoaded}
            region={region}
            slices={slice}
            numTimesteps={numTimesteps}
            time={time}
            playControls={props.playControls}
            playingAxis={props.playingAxis}
          />
        )}
      </BottomPanel>
      {renderOverlay()}
    </div>
  );
};

export default connectToViewerState(ViewerWrapper, [
  "autorotate",
  "viewMode",
  "region",
  "slice",
  "time",
  "changeViewerSetting",
]);

const STYLES: Styles = {
  viewer: {
    display: "flex",
    position: "relative",
  },
  view3d: {
    width: "100%",
    display: "flex",
    overflow: "hidden",
  },
  noImage: {
    position: "absolute",
    zIndex: 999,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eeeee",
    color: "#9b9b9b",
    fontSize: "2em",
    opacity: 0.75,
  },
};
