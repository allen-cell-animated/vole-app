import { ReloadOutlined } from "@ant-design/icons";
import { Button, Radio, Select, Tooltip } from "antd";
import { debounce } from "lodash";
import React from "react";

import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../ViewerStateProvider/types";

import ViewerIcon from "../shared/ViewerIcon";
import { connectToViewerState } from "../ViewerStateProvider";
import DownloadButton from "./DownloadButton";
import ViewModeRadioButtons from "./ViewModeRadioButtons";

import "./styles.css";

type ToolbarProps = {
  // From parent
  cellDownloadHref: string;
  fovDownloadHref: string;
  hasCellId: boolean;
  hasParentImage: boolean;
  canPathTrace: boolean;

  resetCamera: () => void;
  downloadScreenshot: () => void;

  visibleControls: {
    autoRotateButton: boolean;
    viewModeRadioButtons: boolean;
    fovCellSwitchControls: boolean;
    resetCameraButton: boolean;
    showAxesButton: boolean;
    showBoundingBoxButton: boolean;
  };

  // From viewer state
  imageType: ImageType;
  renderMode: RenderMode;
  viewMode: ViewMode;
  autorotate: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  changeViewerSetting: ViewerSettingUpdater;
  resetToSavedViewerState: () => void;
};

const RESIZE_DEBOUNCE_DELAY = 50;

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0",
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const leftRef = React.useRef<HTMLDivElement>(null);
  const rightRef = React.useRef<HTMLDivElement>(null);
  const centerRef = React.useRef<HTMLDivElement>(null);

  const [scrollMode, setScrollMode] = React.useState(false);
  const [showScrollBtnLeft, setScrollBtnLeft] = React.useState(false);
  const [showScrollBtnRight, setScrollBtnRight] = React.useState(false);

  // Scroll buttons are only visible when toolbar can be scrolled in that direction.
  // This may change on either scroll or resize.
  const checkScrollBtnVisible = React.useCallback((): void => {
    const barEl = barRef.current;
    if (!barEl) {
      return;
    }
    setScrollBtnLeft(barEl.scrollLeft > 0);
    setScrollBtnRight(barEl.scrollLeft < barEl.scrollWidth - barEl.clientWidth);
  }, []);

  // This is effectively a `useCallback` - it memoizes a function - but since we're feeding the whole function into
  // lodash's `debounce`, using `useMemo` memoizes the transformation done by `debounce` as well.
  const checkSize = React.useMemo(() => {
    return debounce((): void => {
      if (!leftRef.current || !centerRef.current || !rightRef.current || !barRef.current) {
        return;
      }
      const leftRect = leftRef.current.getBoundingClientRect();
      const centerRect = centerRef.current.getBoundingClientRect();
      const rightRect = rightRef.current.getBoundingClientRect();

      // when calculating width required to leave scroll mode, add a bit of extra width to ensure that triggers
      // for entering and leaving scroll mode never overlap (causing toolbar to rapidly switch when resizing)
      const SCROLL_OFF_EXTRA_WIDTH = 15;

      setScrollMode((mode) => {
        if (mode) {
          // Leave scroll mode if there is enough space for centered controls not to overlap left/right-aligned ones
          const barWidth = barRef.current!.getBoundingClientRect().width;
          const requiredWidth =
            Math.max(leftRect.width, rightRect.width) * 2 + centerRect.width + SCROLL_OFF_EXTRA_WIDTH;
          return barWidth <= requiredWidth;
        } else {
          // Enter scroll mode if centered controls are overlapping either left/right-aligned ones
          return leftRect.right > centerRect.left || centerRect.right > rightRect.left;
        }
      });
      checkScrollBtnVisible();
    }, RESIZE_DEBOUNCE_DELAY);
  }, [checkScrollBtnVisible]);

  React.useEffect(() => {
    // Make sure `checkSize` is run once on mount
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, [checkSize]);

  const scrollX = (amount: number): number => (barRef.current!.scrollLeft += amount);

  // Translate vertical scrolling into horizontal scrolling
  const wheelHandler: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (e.deltaY === 0) {
      return;
    }
    scrollX(e.deltaY);
  };

  const toggleAxis = (): void => props.changeViewerSetting("showAxes", !props.showAxes);
  const toggleBoundingBox = (): void => props.changeViewerSetting("showBoundingBox", !props.showBoundingBox);
  // TODO remove ant-btn-icon-only hack when upgrading antd
  const classForToggleBtn = (active: boolean): string =>
    "ant-btn-icon-only btn-borderless" + (active ? " btn-active" : "");

  const { changeViewerSetting, resetToSavedViewerState, visibleControls, showAxes, showBoundingBox, autorotate } =
    props;
  const twoDMode = props.viewMode !== ViewMode.threeD;

  const renderGroup1 =
    visibleControls.viewModeRadioButtons || visibleControls.resetCameraButton || visibleControls.autoRotateButton;
  const renderGroup4 = visibleControls.showAxesButton || visibleControls.showBoundingBoxButton;

  const axesToggleTitle = showAxes ? "Hide axes" : "Show axes";
  const boundingBoxToggleTitle = showBoundingBox ? "Hide bounding box" : "Show bounding box";
  const turntableToggleTitle = autorotate ? "Turn off turntable" : "Turn on turntable";

  const getPopupContainer = containerRef.current ? () => containerRef.current! : undefined;

  return (
    <div className={`viewer-toolbar-container${scrollMode ? " viewer-toolbar-scroll" : ""}`} ref={containerRef}>
      <div
        className="viewer-toolbar-scroll-left"
        style={{ display: showScrollBtnLeft ? "flex" : "none" }}
        onClick={() => scrollX(-100)}
      >
        <ViewerIcon type="closePanel" style={{ fontSize: "12px", transform: "rotate(180deg)" }} />
      </div>
      <div className="viewer-toolbar" ref={barRef} onWheel={wheelHandler} onScroll={checkScrollBtnVisible}>
        <div className="viewer-toolbar-left" ref={leftRef}>
          <Tooltip placement="bottom" title="Reset to initial settings" trigger={["focus", "hover"]}>
            <Button className="ant-btn-icon-only btn-borderless" onClick={resetToSavedViewerState}>
              <ReloadOutlined />
              <span style={visuallyHiddenStyle}>Reset to initial settings</span>
            </Button>
          </Tooltip>
        </div>
        <div className="viewer-toolbar-center" ref={centerRef}>
          {renderGroup1 && (
            <div className="viewer-toolbar-group">
              {visibleControls.viewModeRadioButtons && (
                <ViewModeRadioButtons
                  mode={props.viewMode}
                  onViewModeChange={(newMode) => changeViewerSetting("viewMode", newMode)}
                />
              )}
              {visibleControls.resetCameraButton && (
                <Tooltip placement="bottom" title="Reset camera">
                  <Button className="ant-btn-icon-only btn-borderless" onClick={props.resetCamera}>
                    <ViewerIcon type="resetView" />
                  </Button>
                </Tooltip>
              )}
              {visibleControls.autoRotateButton && (
                <Tooltip placement="bottom" title={turntableToggleTitle}>
                  <Button
                    className={classForToggleBtn(autorotate && !twoDMode)}
                    disabled={twoDMode || props.renderMode === RenderMode.pathTrace}
                    onClick={() => changeViewerSetting("autorotate", !autorotate)}
                  >
                    <ViewerIcon type="turnTable" />
                  </Button>
                </Tooltip>
              )}
            </div>
          )}

          {visibleControls.fovCellSwitchControls && props.hasCellId && props.hasParentImage && (
            <div className="viewer-toolbar-group">
              <Radio.Group
                value={props.imageType}
                onChange={({ target }) => changeViewerSetting("imageType", target.value)}
              >
                <Radio.Button value={ImageType.segmentedCell}>Single cell</Radio.Button>
                <Radio.Button value={ImageType.fullField}>Full field</Radio.Button>
              </Radio.Group>
            </div>
          )}

          <div className="viewer-toolbar-group">
            <Select
              className="select-render-setting"
              popupClassName="viewer-toolbar-dropdown"
              value={props.renderMode}
              onChange={(value) => changeViewerSetting("renderMode", value)}
              getPopupContainer={getPopupContainer}
            >
              <Select.Option value={RenderMode.volumetric} key={RenderMode.volumetric}>
                Volumetric
              </Select.Option>
              {props.canPathTrace && (
                <Select.Option value={RenderMode.pathTrace} key={RenderMode.pathTrace} disabled={twoDMode}>
                  Path trace
                </Select.Option>
              )}
              <Select.Option value={RenderMode.maxProject} key={RenderMode.maxProject}>
                Max project
              </Select.Option>
            </Select>
          </div>

          {renderGroup4 && (
            <div className="viewer-toolbar-group">
              {visibleControls.showAxesButton && (
                <Tooltip placement="bottom" title={axesToggleTitle}>
                  <Button className={classForToggleBtn(showAxes)} onClick={toggleAxis}>
                    <ViewerIcon type="axes" />
                  </Button>
                </Tooltip>
              )}
              {visibleControls.showBoundingBoxButton && (
                <Tooltip placement="bottom" title={boundingBoxToggleTitle}>
                  <Button className={classForToggleBtn(showBoundingBox)} onClick={toggleBoundingBox}>
                    <ViewerIcon type="boundingBox" />
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        <div className="viewer-toolbar-right viewer-toolbar-group" ref={rightRef}>
          <Tooltip placement="bottom" title="Download">
            <DownloadButton
              cellDownloadHref={props.cellDownloadHref}
              fovDownloadHref={props.fovDownloadHref}
              hasFov={props.hasCellId && props.hasParentImage}
            />
          </Tooltip>
          <Tooltip placement="bottom" title="Screenshot">
            <Button className="ant-btn-icon-only btn-borderless" onClick={props.downloadScreenshot}>
              <ViewerIcon type="camera" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <div
        className="viewer-toolbar-scroll-right"
        style={{ display: showScrollBtnRight ? "flex" : "none" }}
        onClick={() => scrollX(100)}
      >
        <ViewerIcon type="closePanel" style={{ fontSize: "12px" }} />
      </div>
    </div>
  );
};

export default connectToViewerState(Toolbar, [
  "imageType",
  "renderMode",
  "viewMode",
  "autorotate",
  "showAxes",
  "showBoundingBox",
  "changeViewerSetting",
  "resetToSavedViewerState",
]);
