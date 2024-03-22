import { _drawLegend } from "./drawlegend.js";
import { _setupParamFns } from "./setupparams.js";
import * as d3 from "d3";

interface HeatmapGlyphOptions {
  colourScheme?: d3.scaleSequential<string>;
  colourAutoscale?: boolean;
  valueFn: (row: any, global: any) => number;
  normaliseValueFn?: (row: any) => number;
  weightValueFn?: (row: any) => number;
  type: "mean" | "sum" | "weightedMean" | "count";
  useTransparency?: boolean;
  showLegend?: boolean;
  numberFormatFn?: (value: number) => string;
  initFn?: (cells: any[], cellSize: number, global: any, panel: any) => void;
  preDrawFn?: (
    cells: any[],
    cellSize: number,
    ctx: CanvasRenderingContext2D,
    global: any,
    panel: any
  ) => void;
  postDrawFn?: (
    cells: any[],
    cellSize: number,
    ctx: CanvasRenderingContext2D,
    global: any,
    panel: any
  ) => void;
  aggrFn?: (
    cell: any,
    row: any,
    weight: number,
    global: any,
    panel: any
  ) => void;
  postAggrFn?: (
    cells: any[],
    cellSize: number,
    global: any,
    panel: any
  ) => void;
  tooltipTextFn?: (cell: any) => string;
}

interface ColourScaleParamFns {
  name: string;
  decKey: string;
  decFn: (v: number) => number;
  incKey: string;
  incFn: (v: number) => number;
  resetKey: string;
  autoscale: boolean;
  resetFn: (cells: any[], global: any, panel: any) => number;
}

export const heatmapGlyph = (options: HeatmapGlyphOptions) => {
  if (!options) options = {};
  const colourScheme = options.colourScheme
    ? options.colourScheme
    : d3.scaleSequential(d3.interpolateOranges);
  const colourAutoscale =
    options.colourAutoscale !== undefined ? options.colourAutoscale : true;
  const valueFn = options.valueFn || ((row: any, global: any) => 0); // add default value
  const normaliseValueFn = options.normaliseValueFn; //only expected to be used for sum and count
  const weightValueFn = options.weightValueFn; //only works for weighted mean
  const type = options.type || "mean"; // add default value
  const useTransparency =
    options.useTransparency !== undefined ? options.useTransparency : true;
  const showLegend =
    options.showLegend !== undefined ? options.showLegend : true;
  const numberFormatFn = options.numberFormatFn;

  // Add default values for valueFn and type
  const heatmapOptions: HeatmapGlyphOptions = {
    valueFn: valueFn,
    type: type,
    normaliseValueFn: normaliseValueFn,
    weightValueFn: weightValueFn,
    colourScheme: colourScheme,
    colourAutoscale: colourAutoscale,
    useTransparency: useTransparency,
    showLegend: showLegend,
    numberFormatFn: numberFormatFn,
    initFn: options.initFn,
    preDrawFn: options.preDrawFn,
    postDrawFn: options.postDrawFn,
    aggrFn: options.aggrFn,
    postAggrFn: options.postAggrFn,
    tooltipTextFn: options.tooltipTextFn,
  };
  const initFn = options.initFn;
  const preDrawFn = options.preDrawFn;
  const postDrawFn = options.postDrawFn;
  const aggrFn = options.aggrFn;
  const postAggrFn = options.postAggrFn;
  const tooltipTextFn = options.tooltipTextFn; //replaced tooltip

  const colourScaleParamFns: ColourScaleParamFns = _setupParamFns({
    name: "colourMaxV",
    decKey: "LEFT",
    decFn: (v) => v - v / 10,
    incKey: "RIGHT",
    incFn: (v) => v + v / 10,
    resetKey: "s",
    autoscale: colourAutoscale,
    resetFn: (cells, global, panel) =>
      d3.quantile(
        cells.map((cell) => (cell && cell.value ? cell.value : 0)),
        0.99
      ),
  });

  return {
    scaleParams: [colourScaleParamFns],

    initFn: (cells, cellSize, global, panel) => {
      if (initFn) initFn(cells, cellSize, global, panel);
    },

    kernelSmoothProperties: ["value"],
    kernelSmoothPropertyTypes: ["value"],

    preAggrFn: (cells) => {},
    aggrFn: (cell, row, weight, global, panel) => {
      let v;
      if (type != "count") v = valueFn(row, global) ?? 0 * weight ?? 0;
      //MEAN
      if (type == "mean") {
        cell.value = cell.value ? cell.value + (v ? v : 0) : v;
        cell.count = cell.count ? cell.count + weight : weight;
      }
      //SUM
      else if (type == "sum") {
        cell.value = cell.value ? cell.value + (v ? v : 0) : v;
        cell.count = cell.count ? cell.count + weight : weight;
      }
      //WEIGHTED MEAN
      else if (type == "weightedMean") {
        const w = weightValueFn ? weightValueFn(row) * weight ?? 0 : weight;
        cell.value = cell.value ? cell.value + v * w : v * w;
        cell.totalWeight = cell.totalWeight ? cell.totalWeight + w : w;
      }
      //COUNT
      else if (type == "count") {
        cell.value = cell.count ? cell.count + weight : weight;
        cell.count = cell.value;
      }

      //FOR EVERYTHING
      cell.count = cell.count ? cell.count + weight : weight;
      if (normaliseValueFn) {
        const denominator = normaliseValueFn(row) ?? 0;
        cell.denominator = cell.denominator
          ? cell.denominator + denominator
          : denominator;
      }

      if (aggrFn) aggrFn(cell, row, weight, global, panel);
    },

    postAggrFn: (cells, cellSize, global, panel) => {
      //MEAN
      if (type == "mean") {
        for (const cell of cells) {
          if (cell && cell.count) {
            cell.value = cell.value / cell.count;
          }
        }
      }
      //WEIGHTED MEAN
      if (type == "weightedMean") {
        for (const cell of cells) {
          if (cell && cell.count) {
            cell.value = cell.value / cell.totalWeight;
          }
        }
      }
      //FOR EVERYTHING
      if (normaliseValueFn)
        for (const cell of cells) {
          cell.value = cell.value / cell.denominator ?? 0;
        }

      if (postAggrFn) postAggrFn(cells, cellSize, global, panel);
    },

    preDrawFn: (cells, cellSize, ctx, global, panel) => {
      if (preDrawFn) preDrawFn(cells, cellSize, ctx, global, panel);
      global.colourScale = d3
        .scaleLinear()
        .domain([0, global.colourMaxV])
        .range([0, 1])
        .clamp(true);
    },
    drawFn: (cell, x, y, cellSize, ctx, global, panel) => {
      if (cell && cell.value) {
        const boundary = cell.getBoundary();
        ctx.fillStyle = colourScheme(global.colourScale(cell.value));
        if (useTransparency) ctx.globalAlpha = global.colourScale(cell.value);
        ctx.beginPath();
        ctx.moveTo(boundary[0][0], boundary[0][1]);
        for (let i = 1; i < boundary.length; i++)
          ctx.lineTo(boundary[i][0], boundary[i][1]);
        ctx.closePath();
        ctx.fill();

        // ctx.beginPath();
        // ctx.fillStyle = "#000";
        // ctx.arc(x, y, 2, 0, Math.PI * 2);
        // ctx.fill();
      }
    },
    postDrawFn: (cells, cellSize, ctx, global, panel) => {
      if (showLegend && global.colourMaxV) {
        _drawLegend({
          context: ctx,
          values: cells.map((item) => (item ? item.value : NaN)),
          minV: 0,
          maxV: global.colourMaxV,
          numBins: 20,
          x: panel.getWidth() - 160,
          y: panel.getHeight() - 60,
          width: 150,
          height: 50,
          colourScale: colourScheme,
        });
        if (postDrawFn) postDrawFn(cells, cellSize, ctx, global, panel);
      }
    },
    tooltipTextFn: (cell) => {
      if (tooltipTextFn) return tooltipTextFn(cell);
      else {
        //   console.log(cell);
        if (cell.value !== undefined) {
          return numberFormatFn ? numberFormatFn(cell.value) : cell.value;
        } else return "";
      }
    },
  };
};
