import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { glyphMap, heatmapGlyph, _setupParamFns } from "../dist/index.min.js";

// import data
async function getData(url) {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

const data = await getData("./data/data.json");

// Declare glyphmap
const container = glyphMap({
  data: data,
  getLocationFn: (row) => [row.lon, row.lat],
  cellSize: 35,
  discretisationShape: "grid",
  //discretisationMode: "relativeToMouse",
  showLegend: false,
  interactiveCellSize: true,
  //interactiveKernelBW: true,
  //kernelBW: 2,
  interactiveZoomPan: true,
  // mapType: tile,
  // greyscale: true,
  tileWidth: 150,

  width: 600,
  height: 400,

  customMap: {
    scaleParams: [
      _setupParamFns({
        name: "heightMaxV",
        decKey: "LEFT",
        decFn: (v) => v - v / 10,
        incKey: "RIGHT",
        incFn: (v) => v + v / 10,
        resetKey: "s",
        autoscale: true,
        resetFn: (cells, global, panel) =>
          d3.max(
            cells.map((cell) =>
              cell && cell.ts ? d3.max(cell.ts.map((ts) => d3.max(ts))) : 0
            )
          ),
      }),
    ],

    //kernelSmoothProperties: ["ts", "count"],
    //kernelSmoothPropertyTypes: ["array", "value"],

    initFn: (cells, cellSize, global, panel) => {
      global.numT = d3.max(panel.data.map((row) => row.ts.length));
    },

    preAggrFn: (cells, cellSize, global, panel) => {},

    aggrFn: (cell, row, weight, global, panel) => {
      if (!cell.ts) cell.ts = [];
      const sums = [];
      const cs = [];
      cell.ts.push(row.ts);
      if (!cell.stations) cell.stations = [];
      if (!cell.stations.includes(row.name)) cell.stations.push(row.name);
    },

    postAggrFn: (cells, cellSize, global, panel) => {},

    preDrawFn: (cells, cellSize, ctx, global, panel) => {
      // ctx.fillStyle = "#fff9";
      // ctx.fillRect(0, 0, panel.getWidth(), panel.getHeight());

      global.heightScale = d3
        .scaleLinear()
        .domain([0, global.heightMaxV])
        .range([0, cellSize])
        .clamp(true);
    },

    drawFn: (cell, x, y, cellSize, ctx, global, panel) => {
      //console.log(x, y);
      if (cell && cell.ts && !cell.new) {
        const padding = 4;
        const incX = (cellSize - padding * 2) / global.numT;

        // get current zoom
        let zoom = Math.log2(panel.getTransform().k).toFixed(2);
        const mouse = [global.mouseX, global.mouseY];
        // console.log("locafn", panel.screenToCoord(mouse));
        // console.log("locafn", global.mouseCell.getXCentre());
        // console.log(zoom);

        //test screen coord
        // const scoord = panel.screenToCoord([0, cellSize]);
        // console.log("screencord", scoord);

        //draw cell background
        const boundary = cell.getBoundary(padding);
        ctx.fillStyle = "#cccb";
        if (zoom >= 12) ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.moveTo(boundary[0][0], boundary[0][1]);
        for (let i = 1; i < boundary.length; i++)
          ctx.lineTo(boundary[i][0], boundary[i][1]);
        ctx.closePath();
        ctx.fill();

        for (const ts of cell.ts) {
          ctx.beginPath();
          ctx.strokeStyle = "#8557";
          if (zoom >= 12) ctx.strokeStyle = "red";
          for (let i = 0; i < ts.length; i++) {
            ctx.lineTo(
              x - cellSize / 2 + padding + incX * i,
              y + cellSize / 2 - padding - global.heightScale(ts[i])
            );
          }
          ctx.stroke();
        }
      }
    },
    postDrawFn: (cells, cellSize, ctx, global, panel) => {},
    tooltipTextFn: (cell) => {
      return cell.stations ? cell.stations : "";
    },
  },
});

// const container = glyphMap({
//   data: data,
//   getLocationFn: (row) => [row.lon, row.lat],
//   cellSize: 3,
//   interactiveCellSize: true,
//   interactiveKernelBW: true,
//   kernelBW: 5,
//   useBlur: true,

//   //   width: window.innerWidth - 40,
//   width: 600,
//   height: 400,
//   // height: window.innerHeight - 100,
//   tileWidth: 150,
//   greyscale: true,

//   glyph: heatmapGlyph({
//     valueFn: (row, global) => row.ts[row.ts.length - 1],
//     type: "mean",
//     colourScheme: d3.scaleSequential(d3.interpolatePurples),
//     colourAutoscale: true,
//     useTransparency: true,
//     showLegend: false,
//     numberFormatFn: (value) => +value.toFixed(3),
//   }),
// });

const canvas = container.querySelector("canvas");

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth - 40;
  canvas.height = window.innerHeight - 100;
});

// select the div element
const parentDiv = document.querySelector("#map");

// add the child element to the parent div
parentDiv.appendChild(container);
