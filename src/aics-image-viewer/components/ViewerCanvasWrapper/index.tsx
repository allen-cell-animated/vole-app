import type { View3d, Volume } from "@aics/vole-core";
import { LoadingOutlined } from "@ant-design/icons";
import React from "react";

import {
  CLIPPING_PANEL_HEIGHT_COLLAPSED,
  CLIPPING_PANEL_HEIGHT_DEFAULT,
  CLIPPING_PANEL_HEIGHT_TALL,
} from "../../shared/constants";
import { ViewMode } from "../../shared/enums";
import type { AxisName, PerAxis, Styles } from "../../shared/types";
import type PlayControls from "../../shared/utils/playControls";
import { select, useViewerState } from "../../state/store";
import { ViewMode } from "../../state/types";

import BottomPanel from "../BottomPanel";
import { AxisClipSliders } from "../dimension_sliders/AxisClipSliders";
import { RotationSliders } from "../dimension_sliders/RotationSliders";

import "./styles.css";

type ViewerWrapperProps = {
  view3d: View3d;
  loadingImage: boolean;
  appHeight: string;
  image: Volume | null;
  numSlices: XYZ<number>;
  numSlicesLoaded: XYZ<number>;
  playControls: PlayControls;
  playingAxis: AxisName | "t" | null;
  numTimesteps: number;
  numScenes: number;
  visibleControls: {
    axisClipSliders: boolean;
    rotationSliders: boolean;
  };
  clippingPanelOpen?: boolean;
  onClippingPanelOpenChange?: (visible: boolean) => void;
  /** Height of the toolbar floating over the top of the viewport. */
  toolbarHeight: number;
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
  const clippingPanelHeight = clippingPanelTall ? CLIPPING_PANEL_HEIGHT_TALL : CLIPPING_PANEL_HEIGHT_DEFAULT;
  // `BottomPanel` defaults to open when the prop is omitted
  const clippingPanelOpen = props.clippingPanelOpen ?? true;

  // The triple projection view fills the whole viewport, so its outer rows would otherwise be hidden behind the
  // toolbar and clipping drawer floating over the canvas. Shrink the viewport to fit between them instead.
  const tripleProj = viewMode === ViewMode.tripleProj;
  const viewportInsetTop = tripleProj ? props.toolbarHeight : 0;
  const viewportInsetBottom = tripleProj
    ? clippingPanelOpen
      ? clippingPanelHeight
      : CLIPPING_PANEL_HEIGHT_COLLAPSED
    : 0;

  // `View3d` sizes itself from its parent element, so it needs a nudge after an inset changes the parent's height.
  const { view3d } = props;
  React.useEffect(() => view3d.resize(null), [view3d, viewportInsetTop, viewportInsetBottom]);

  const bottomPanelContents = [];

  if (visibleControls.axisClipSliders && !!props.image) {
    bottomPanelContents.push({
      title: "Clipping",
      children: (
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
      ),
    });
  }

  if (visibleControls.rotationSliders) {
    bottomPanelContents.push({
      title: "Rotation",
      children: <RotationSliders view3d={props.view3d} disable={viewMode !== ViewMode.threeD} />,
    });
  }

  return (
    <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
      <div
        ref={view3dviewerRef}
        style={{ ...STYLES.view3d, marginTop: viewportInsetTop, marginBottom: viewportInsetBottom }}
      ></div>
      <BottomPanel
        open={props.clippingPanelOpen}
        onPageChange={(open) => props.onClippingPanelOpenChange?.(open !== null)}
        height={clippingPanelHeight}
        contents={bottomPanelContents}
      ></BottomPanel>
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
