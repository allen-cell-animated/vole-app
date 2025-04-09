import { Channel, ControlPoint, Histogram, Lut } from "@aics/vole-core";
import { Button, Checkbox, InputNumber, Tooltip } from "antd";
import * as d3 from "d3";
import "nouislider/distribute/nouislider.css";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ColorResult, SketchPicker } from "react-color";

import { LUT_MAX_PERCENTILE, LUT_MIN_PERCENTILE, TFEDITOR_DEFAULT_COLOR } from "../../shared/constants";
import {
  ColorArray,
  colorArrayToObject,
  colorArrayToString,
  colorObjectToArray,
} from "../../shared/utils/colorRepresentations";
import { controlPointsToRamp, rampToControlPoints } from "../../shared/utils/controlPointsToLut";
import { useRefWithSetter } from "../../shared/utils/hooks";
import type { SingleChannelSettingUpdater } from "../ViewerStateProvider/types";

import SliderRow from "../shared/SliderRow";

import "./styles.css";

/**The color picker opens next to control points like a context menu. This constant gives it a bit of space. */
const TFEDITOR_COLOR_PICKER_MARGIN_X_PX = 2;
/** If a control point is within this distance of the bottom of the screen, open the color picker upward */
const TFEDITOR_COLOR_PICKER_OPEN_UPWARD_MARGIN_PX = 310;

const TFEDITOR_GRADIENT_MAX_OPACITY = 0.9;
const TFEDITOR_NUM_TICKS = 4;

const TFEDITOR_MARGINS = {
  top: 18,
  right: 20,
  bottom: 30, // includes space for x-axis
  left: 25,
};

const MOUSE_EVENT_BUTTONS_PRIMARY = 1;

const enum TfEditorRampSliderHandle {
  Min = "min",
  Max = "max",
}

type TfEditorProps = {
  id: string;
  width: number;
  height: number;
  channelData: Channel;
  changeChannelSetting: SingleChannelSettingUpdater;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  useControlPoints: boolean;
  controlPoints: ControlPoint[];
  ramp: [number, number];
};

const TF_GENERATORS: Record<string, (histogram: Histogram) => Lut> = {
  autoXF: (histo) => {
    // Currently unused. min and max are the first and last bins whose values are >=10% that of the max bin
    const [hmin, hmax] = histo.findAutoMinMax();
    return new Lut().createFromMinMax(hmin, hmax);
  },
  auto2XF: (histo) => {
    const [hmin, hmax] = histo.findAutoIJBins();
    return new Lut().createFromMinMax(hmin, hmax);
  },
  auto98XF: (histo) => {
    const hmin = histo.findBinOfPercentile(LUT_MIN_PERCENTILE);
    const hmax = histo.findBinOfPercentile(LUT_MAX_PERCENTILE);
    return new Lut().createFromMinMax(hmin, hmax);
  },
  bestFitXF: (histo) => {
    const [hmin, hmax] = histo.findBestFitBins();
    return new Lut().createFromMinMax(hmin, hmax);
  },
  resetXF: (_histo) => new Lut().createFullRange(),
};

// *---*
// |   |
// |   |
//  \ /
//   *
// width: 0.65 * height; height of rectangle: 0.6 * height; height of triangle: 0.4 * height
const sliderHandleSymbol: d3.SymbolType = {
  draw: (context, size) => {
    // size is symbol area in px^2
    const height = Math.sqrt(size * 1.9);
    const triangleHeight = height * 0.4;
    const halfWidth = height * 0.325;

    context.moveTo(-halfWidth, -height);
    context.lineTo(halfWidth, -height);
    context.lineTo(halfWidth, -triangleHeight);
    context.lineTo(0, 0);
    context.lineTo(-halfWidth, -triangleHeight);
    context.closePath();
  },
};

function u8ToAbsolute(value: number, channel: Channel): number {
  return channel.rawMin + (value / 255) * (channel.rawMax - channel.rawMin);
}

function absoluteToU8(value: number, channel: Channel): number {
  return ((value - channel.rawMin) / (channel.rawMax - channel.rawMin)) * 255;
}

function controlPointToAbsolute(cp: ControlPoint, channel: Channel): number {
  // the x value of the control point is in the range [0, 255]
  // because of the way the histogram is generated
  // (see LUT_ENTRIES and the fact that we use Uint8Array)
  return u8ToAbsolute(cp.x, channel);
}

/** Defines an SVG gradient with id `id` based on the provided `controlPoints` */
const ControlPointGradientDef: React.FC<{ controlPoints: ControlPoint[]; id: string }> = ({ controlPoints, id }) => {
  const range = controlPoints[controlPoints.length - 1].x - controlPoints[0].x;
  return (
    <defs>
      <linearGradient id={id} gradientUnits="objectBoundingBox" spreadMethod="pad" x2="100%">
        {controlPoints.map((cp, i) => {
          const offset = `${((cp.x - controlPoints[0].x) / range) * 100}%`;
          const opacity = Math.min(cp.opacity, TFEDITOR_GRADIENT_MAX_OPACITY);
          return <stop key={i} stopColor={colorArrayToString(cp.color)} stopOpacity={opacity} offset={offset} />;
        })}
      </linearGradient>
    </defs>
  );
};

/** Retrieves the bin contents and max bin value from `histogram` */
function getHistogramBinLengths(histogram: Histogram): { binLengths: number[]; max: number } {
  const binLengths = [];
  // TODO: Change `histogram.bins` to be readable/readonly
  // so we don't have to copy it here!
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < histogram.getNumBins(); i++) {
    const binLength = histogram.getBin(i);
    binLengths.push(binLength);
    max = Math.max(max, binLength);
  }
  return { binLengths, max };
}

const colorPickerPositionToStyle = ([x, y]: [number, number]): React.CSSProperties => ({
  position: "absolute",
  [x < 0 ? "right" : "left"]: Math.abs(x),
  [y < 0 ? "bottom" : "top"]: y,
});

const numberFormatter = (v: number | string | undefined): string => (v === undefined ? "" : Number(v).toFixed(0));

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const TfEditor: React.FC<TfEditorProps> = (props) => {
  const { changeChannelSetting } = props;

  const innerWidth = props.width - TFEDITOR_MARGINS.left - TFEDITOR_MARGINS.right;
  const innerHeight = props.height - TFEDITOR_MARGINS.top - TFEDITOR_MARGINS.bottom;

  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [draggedPointIdx, _setDraggedPointIdx] = useState<number | TfEditorRampSliderHandle | null>(null);

  const _setCPs = useCallback(
    (p: ControlPoint[]) => changeChannelSetting({ controlPoints: p }),
    [changeChannelSetting]
  );
  const setRamp = useCallback((ramp: [number, number]) => changeChannelSetting({ ramp: ramp }), [changeChannelSetting]);

  // these bits of state need their freshest, most up-to-date values available in mouse event handlers. make refs!
  const [controlPointsRef, setControlPoints] = useRefWithSetter(_setCPs, props.controlPoints);
  const [draggedPointIdxRef, setDraggedPointIdx] = useRefWithSetter(_setDraggedPointIdx, draggedPointIdx);

  // Either `null` when the control panel is closed, or an x offset into the plot to position the color picker.
  // Positive: offset right from the left edge of the plot; negative: offset left from the right edge of the plot.
  const [colorPickerPosition, setColorPickerPosition] = useState<[number, number] | null>(null);
  const lastColorRef = useRef<ColorArray>(TFEDITOR_DEFAULT_COLOR);

  const svgRef = useRef<SVGSVGElement>(null); // need access to SVG element to measure mouse position

  // d3 scales define the mapping between data and screen space (and do the heavy lifting of generating plot axes)
  /** `xScale` is in raw intensity range, not U8 range. We use `u8ToAbsolute` and `absoluteToU8` to translate to U8. */
  const xScale = useMemo(
    () => d3.scaleLinear().domain([props.channelData.rawMin, props.channelData.rawMax]).range([0, innerWidth]),
    [innerWidth, props.channelData.rawMin, props.channelData.rawMax]
  );
  const yScale = useMemo(() => d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]), [innerHeight]);

  const mouseEventToControlPointValues = (event: MouseEvent | React.MouseEvent): [number, number] => {
    const svgRect = svgRef.current?.getBoundingClientRect() ?? { x: 0, y: 0 };
    return [
      absoluteToU8(
        xScale.invert(clamp(event.clientX - svgRect.x - TFEDITOR_MARGINS.left, 0, innerWidth)),
        props.channelData
      ),
      yScale.invert(clamp(event.clientY - svgRect.y - TFEDITOR_MARGINS.top, 0, innerHeight)),
    ];
  };

  const dragControlPoint = (draggedIdx: number, x: number, opacity: number): void => {
    const newControlPoints = [...controlPointsRef.current];
    const draggedPoint = newControlPoints[draggedIdx];
    draggedPoint.x = x;
    draggedPoint.opacity = opacity;

    // Remove control points to keep the list sorted by x value
    const bisector = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x);
    const idxLeft = bisector.left(newControlPoints, draggedPoint);
    const idxRight = bisector.right(newControlPoints, draggedPoint);

    if (idxLeft < draggedIdx) {
      const numPointsToRemove = draggedIdx - idxLeft; // should almost always be 1
      newControlPoints.splice(idxLeft, numPointsToRemove);

      const newIdx = draggedIdx - numPointsToRemove;
      setDraggedPointIdx(newIdx);
      setSelectedPointIdx(newIdx);
    } else if (idxRight > draggedIdx + 1) {
      newControlPoints.splice(draggedIdx + 1, idxRight - draggedIdx - 1);
    }

    setControlPoints(newControlPoints);
  };

  const dragRampSlider = (handle: TfEditorRampSliderHandle, x: number): void => {
    if (handle === TfEditorRampSliderHandle.Min) {
      const max = props.ramp[1];
      setRamp([Math.min(x, max), max]);
    } else {
      const min = props.ramp[0];
      setRamp([min, Math.max(x, min)]);
    }
  };

  const handlePlotPointerDown: React.PointerEventHandler<SVGSVGElement> = (event) => {
    if (props.useControlPoints) {
      // Advanced mode - we're either creating a new control point or selecting/dragging an existing one
      if (draggedPointIdxRef.current === null && event.button === 0) {
        // this click is not on an existing point - create a new one
        const [x, opacity] = mouseEventToControlPointValues(event);
        const point = { x, opacity, color: lastColorRef.current };

        // add new control point to controlPoints
        const index = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).left(props.controlPoints, point);
        setDraggedPointIdx(index);

        const newControlPoints = [...props.controlPoints];
        newControlPoints.splice(index, 0, point);
        setControlPoints(newControlPoints);
      } else {
        // this click is on an existing point - update current points to ref (may have been remapped since last edit)
        controlPointsRef.current = props.controlPoints;
      }

      if (typeof draggedPointIdxRef.current !== "string") {
        setSelectedPointIdx(draggedPointIdxRef.current);
      }
    }

    if (event.button === 0 && draggedPointIdxRef.current !== null) {
      // get set up to drag the point around, even if the mouse leaves the SVG element
      event.currentTarget.setPointerCapture(event.nativeEvent.pointerId);
    } else {
      setDraggedPointIdx(null);
    }
  };

  const handlePlotPointerMove: React.PointerEventHandler<SVGSVGElement> = (event) => {
    if (draggedPointIdxRef.current === null) {
      return;
    }

    if ((event.buttons & MOUSE_EVENT_BUTTONS_PRIMARY) === 0) {
      handleDragEnd(event);
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    const [x, opacity] = mouseEventToControlPointValues(event);

    // `draggedPointIdxRef` may either be a number (control point index) or a string (ramp slider handle).
    // The result of this check should always be the same as `props.useControlPoints`, but this narrows the type for TS
    if (typeof draggedPointIdxRef.current === "number") {
      dragControlPoint(draggedPointIdxRef.current, x, opacity);
    } else {
      dragRampSlider(draggedPointIdxRef.current, x);
    }
  };

  const handleDragEnd: React.PointerEventHandler<SVGSVGElement> = (event) => {
    setDraggedPointIdx(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleControlPointContextMenu: React.MouseEventHandler<SVGCircleElement> = (event) => {
    event.preventDefault();
    if (!event.target || !svgRef.current) {
      setColorPickerPosition(null);
      return;
    }

    const svgRect = svgRef.current.getBoundingClientRect();
    const cpRect = (event.target as SVGCircleElement).getBoundingClientRect();
    const cpRectCenter = cpRect.left + cpRect.width / 2;

    // If the control point is closer to the left edge of the SVG, open the color picker to the right
    const openLeft = cpRectCenter - svgRect.left < svgRect.width / 2;
    const xPosition = openLeft
      ? cpRect.right - svgRect.left + TFEDITOR_COLOR_PICKER_MARGIN_X_PX
      : cpRect.left - svgRect.right - TFEDITOR_COLOR_PICKER_MARGIN_X_PX;

    // If the control point is too close to the bottom of the screen, open the color picker upward
    const openUp = window.innerHeight - cpRect.bottom < TFEDITOR_COLOR_PICKER_OPEN_UPWARD_MARGIN_PX;
    const yPosition = openUp ? svgRect.top - cpRect.bottom : cpRect.top - svgRect.top;
    setColorPickerPosition([xPosition, yPosition]);
  };

  const handleChangeColor = (color: ColorResult): void => {
    lastColorRef.current = colorObjectToArray(color.rgb);
    if (selectedPointIdx !== null) {
      const newControlPoints = [...props.controlPoints];
      newControlPoints[selectedPointIdx].color = lastColorRef.current;
      setControlPoints(newControlPoints);
    }
  };

  const controlPointsToRender = useMemo(
    () => (props.useControlPoints ? props.controlPoints : rampToControlPoints(props.ramp)),
    [props.controlPoints, props.ramp, props.useControlPoints]
  );

  /** d3-generated svg data string representing both the line between points and the region filled with gradient */
  const areaPath = useMemo(() => {
    const areaGenerator = d3
      .area<ControlPoint>()
      .x((d) => xScale(controlPointToAbsolute(d, props.channelData)))
      .y0((d) => yScale(d.opacity))
      .y1(innerHeight)
      .curve(d3.curveLinear);
    return areaGenerator(controlPointsToRender) ?? undefined;
  }, [controlPointsToRender, xScale, yScale, innerHeight]);

  /** d3-generated svg data string representing the "basic mode" min/max slider handles */
  const sliderHandlePath = useMemo(() => d3.symbol().type(sliderHandleSymbol).size(80)() ?? undefined, []);

  // The below `useCallback`s are used as "ref callbacks" - passed as the `ref` prop of SVG elements in order to render
  // these elements' content using D3. They are called when the ref'd component mounts and unmounts, and whenever their
  // identity changes (i.e. whenever their dependencies change).

  const xAxisRef = useCallback(
    (el: SVGGElement) => {
      const ticks = xScale.ticks(TFEDITOR_NUM_TICKS);
      ticks[ticks.length - 1] = xScale.domain()[1];
      d3.select(el).call(
        d3
          .axisBottom(xScale)
          .tickValues(ticks)
          .tickPadding(props.useControlPoints ? 3 : 10) // get tick labels out of the way of sliders in "basic" mode
      );
    },
    [xScale, props.useControlPoints]
  );

  const yAxisRef = useCallback(
    (el: SVGGElement) => d3.select(el).call(d3.axisLeft(yScale).ticks(TFEDITOR_NUM_TICKS)),
    [yScale]
  );

  const histogramRef = useCallback(
    (el: SVGGElement) => {
      if (el === null) {
        return;
      }
      if (props.channelData.histogram.getNumBins() < 1) {
        return;
      }
      const { binLengths, max } = getHistogramBinLengths(props.channelData.histogram);
      const barWidth = innerWidth / props.channelData.histogram.getNumBins();
      const binScale = d3.scaleLog().domain([0.1, max]).range([innerHeight, 0]).base(2).clamp(true);

      d3.select(el)
        .selectAll(".bar") // select all the bars of the histogram
        .data(binLengths) // bind the histogram bins to this selection
        .join("rect") // ensure we have exactly as many bound `rect` elements in the DOM as we have histogram bins
        .attr("class", "bar")
        .attr("width", barWidth)
        .attr("x", (_len, idx) => xScale(u8ToAbsolute(idx, props.channelData))) // set position and height from data
        .attr("y", (len) => binScale(len))
        .attr("height", (len) => innerHeight - binScale(len));
    },
    [props.channelData.histogram, innerWidth, innerHeight]
  );

  const applyTFGenerator = useCallback(
    (generator: string): void => {
      setSelectedPointIdx(null);
      lastColorRef.current = TFEDITOR_DEFAULT_COLOR;
      const lut = TF_GENERATORS[generator](props.channelData.histogram);
      if (props.useControlPoints) {
        setControlPoints(lut.controlPoints.map((cp) => ({ ...cp, color: TFEDITOR_DEFAULT_COLOR })));
      } else {
        setRamp(controlPointsToRamp(lut.controlPoints));
      }
    },
    [props.channelData.histogram, props.useControlPoints]
  );

  const createTFGeneratorButton = (generator: string, name: string, description: string): React.ReactNode => (
    <Tooltip title={description} placement="top">
      <Button onClick={() => applyTFGenerator(generator)}>{name}</Button>
    </Tooltip>
  );

  // create one svg circle element for each control point
  const controlPointCircles = props.useControlPoints
    ? props.controlPoints.map((cp, i) => (
        <circle
          key={i}
          className={i === selectedPointIdx ? "selected" : ""}
          cx={xScale(controlPointToAbsolute(cp, props.channelData))}
          cy={yScale(cp.opacity)}
          style={{ fill: colorArrayToString(cp.color) }}
          r={5}
          onPointerDown={() => setDraggedPointIdx(i)}
          onContextMenu={handleControlPointContextMenu}
        />
      ))
    : null;
  // move selected control point to the end so it's not occluded by other nearby points
  if (controlPointCircles !== null && selectedPointIdx !== null) {
    controlPointCircles.push(controlPointCircles.splice(selectedPointIdx, 1)[0]);
  }

  const viewerModeString = props.useControlPoints ? "advanced" : "basic";

  return (
    <div>
      {/* ----- PRESET BUTTONS ----- */}
      <div className="button-row">
        {createTFGeneratorButton("resetXF", "None", "Reset transfer function to full range.")}
        {createTFGeneratorButton("auto98XF", "Default", "Ramp from 50th percentile to 98th.")}
        {createTFGeneratorButton("auto2XF", "IJ Auto", `Emulates ImageJ's "auto" button.`)}
        {createTFGeneratorButton("bestFitXF", "Auto 2", "Ramp over the middle 80% of data.")}
        <Checkbox
          checked={props.useControlPoints}
          onChange={(e) => changeChannelSetting({ useControlPoints: e.target.checked })}
          style={{ marginLeft: "auto" }}
        >
          Advanced
        </Checkbox>
      </div>

      {/* ----- CONTROL POINT COLOR PICKER ----- */}
      {colorPickerPosition !== null && (
        <div className="tf-editor-popover">
          <div className="tf-editor-cover" onClick={() => setColorPickerPosition(null)} />
          <div style={colorPickerPositionToStyle(colorPickerPosition)}>
            <SketchPicker
              color={colorArrayToObject(lastColorRef.current)}
              onChange={handleChangeColor}
              disableAlpha={true}
            />
          </div>
        </div>
      )}

      {/* ----- PLOT SVG ----- */}
      <svg
        className={`tf-editor-svg ${viewerModeString}${draggedPointIdx !== null ? " dragging" : ""}`}
        ref={svgRef}
        width={props.width}
        height={props.height}
        onPointerDown={handlePlotPointerDown}
        onPointerMove={handlePlotPointerMove}
        onPointerUp={handleDragEnd}
      >
        <ControlPointGradientDef controlPoints={controlPointsToRender} id={`tfGradient-${props.id}`} />
        <g transform={`translate(${TFEDITOR_MARGINS.left},${TFEDITOR_MARGINS.top})`}>
          {/* histogram bars */}
          <g ref={histogramRef} />
          {/* line between control points, and the gradient under it */}
          <path className="line" fill={`url(#tfGradient-${props.id})`} d={areaPath} />
          {/* plot axes */}
          <g ref={xAxisRef} className="axis" transform={`translate(0,${innerHeight})`} />
          <g ref={yAxisRef} className="axis" />
          {/* control points */}
          {controlPointCircles}
          {/* "basic mode" sliders */}
          {!props.useControlPoints && (
            <g className="ramp-sliders">
              <g transform={`translate(${xScale(u8ToAbsolute(props.ramp[0], props.channelData))})`}>
                <line y1={innerHeight} strokeDasharray="5,5" strokeWidth={2} />
                <line
                  className="ramp-slider-click-target"
                  y1={innerHeight}
                  strokeWidth={6}
                  onPointerDown={() => setDraggedPointIdx(TfEditorRampSliderHandle.Min)}
                />
                <path
                  d={sliderHandlePath}
                  transform={`translate(0,${innerHeight}) rotate(180)`}
                  onPointerDown={() => setDraggedPointIdx(TfEditorRampSliderHandle.Min)}
                />
              </g>
              <g transform={`translate(${xScale(u8ToAbsolute(props.ramp[1], props.channelData))})`}>
                <line y1={innerHeight} strokeDasharray="5,5" strokeWidth={2} />
                <line
                  className="ramp-slider-click-target"
                  y1={innerHeight}
                  strokeWidth={6}
                  onPointerDown={() => setDraggedPointIdx(TfEditorRampSliderHandle.Max)}
                />
                <path d={sliderHandlePath} onPointerDown={() => setDraggedPointIdx(TfEditorRampSliderHandle.Max)} />
              </g>
            </g>
          )}
        </g>
      </svg>

      {/* ----- MIN/MAX SPINBOXES ----- */}
      {!props.useControlPoints && (
        <div className="tf-editor-numeric-input-row">
          <span>
            Min{" "}
            <InputNumber
              value={u8ToAbsolute(props.ramp[0], props.channelData)}
              onChange={(v) => v !== null && setRamp([absoluteToU8(v, props.channelData), props.ramp[1]])}
              formatter={numberFormatter}
              min={0}
              max={Math.min(u8ToAbsolute(props.ramp[1], props.channelData), props.channelData.rawMax)}
              size="small"
            />
          </span>
          <span>
            Max{" "}
            <InputNumber
              value={u8ToAbsolute(props.ramp[1], props.channelData)}
              onChange={(v) => v !== null && setRamp([props.ramp[0], absoluteToU8(v, props.channelData)])}
              formatter={numberFormatter}
              min={Math.max(0, u8ToAbsolute(props.ramp[0], props.channelData))}
              max={props.channelData.rawMax}
              size="small"
              width={45}
            />
          </span>
        </div>
      )}

      {/* ----- COLORIZE SLIDER ----- */}
      <SliderRow
        label={
          <Checkbox
            checked={props.colorizeEnabled}
            onChange={(e) => changeChannelSetting({ colorizeEnabled: e.target.checked })}
          >
            Colorize
          </Checkbox>
        }
        max={1}
        start={props.colorizeAlpha}
        onUpdate={(values) => changeChannelSetting({ colorizeAlpha: values[0] })}
        hideSlider={!props.colorizeEnabled}
      />
    </div>
  );
};

export default TfEditor;
