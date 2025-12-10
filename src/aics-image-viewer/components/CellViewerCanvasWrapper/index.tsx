import type { View3d, Volume } from "@aics/vole-core";
import { LoadingOutlined } from "@ant-design/icons";
import React from "react";

import { CLIPPING_PANEL_HEIGHT_DEFAULT, CLIPPING_PANEL_HEIGHT_TALL } from "../../shared/constants";
import { ViewMode } from "../../shared/enums";
import type { AxisName, PerAxis, Styles } from "../../shared/types";
import type PlayControls from "../../shared/utils/playControls";
import { select, useViewerState } from "../../state/store";

import AxisClipSliders from "../AxisClipSliders";
import BottomPanel from "../BottomPanel";

import "./styles.css";

type ViewerWrapperProps = {
  view3d: View3d;
  loadingImage: boolean;
  appHeight: string;
  image: Volume | null;
  numSlices: PerAxis<number>;
  numSlicesLoaded: PerAxis<number>;
  playControls: PlayControls;
  playingAxis: AxisName | "t" | null;
  numTimesteps: number;
  numScenes: number;
  visibleControls: {
    axisClipSliders: boolean;
  };
  clippingPanelOpen?: boolean;
  onClippingPanelOpenChange?: (visible: boolean) => void;
};

const ViewerWrapper: React.FC<ViewerWrapperProps> = (props) => {
  const view3dviewerRef = React.createRef<HTMLDivElement>();

  React.useEffect(() => {
    view3dviewerRef.current!.appendChild(props.view3d.getDOMElement());
  }, [props.view3d, view3dviewerRef]);

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

  const { appHeight, visibleControls, numTimesteps, numScenes } = props;

  const changeViewerSetting = useViewerState(select("changeViewerSetting"));
  const viewMode = useViewerState(select("viewMode"));
  const region = useViewerState(select("region"));
  const slice = useViewerState(select("slice"));
  const time = useViewerState(select("time"));
  const scene = useViewerState(select("scene"));

  const clippingPanelTall = numTimesteps > 1 && numScenes > 1 && viewMode === ViewMode.threeD;

  return (
    <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
      <div ref={view3dviewerRef} style={STYLES.view3d}></div>
      <BottomPanel
        title="Clipping"
        open={props.clippingPanelOpen}
        onOpenChange={props.onClippingPanelOpenChange}
        height={clippingPanelTall ? CLIPPING_PANEL_HEIGHT_TALL : CLIPPING_PANEL_HEIGHT_DEFAULT}
      >
        {visibleControls.axisClipSliders && !!props.image && (
          <AxisClipSliders
            mode={viewMode}
            image={props.image}
            changeViewerSetting={changeViewerSetting}
            numSlices={props.numSlices}
            numSlicesLoaded={props.numSlicesLoaded}
            numScenes={numScenes}
            region={region}
            slices={slice}
            numTimesteps={numTimesteps}
            time={time}
            scene={scene}
            playControls={props.playControls}
            playingAxis={props.playingAxis}
          />
        )}
      </BottomPanel>
      {renderOverlay()}
    </div>
  );
};

export default ViewerWrapper;

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
