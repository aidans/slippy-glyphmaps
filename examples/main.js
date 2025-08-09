import * as d3 from "d3";
import * as L from "leaflet";
import { _setupParamFns, GriddedGlyphLayer } from "../dist/gridded-glyphmaps.leaflet.min.js";

console.log("Main.js loaded");
console.log("GriddedGlyphLayer:", GriddedGlyphLayer);

// Create a standard Leaflet map
const map = L.map('map').setView([51.505, -0.09], 13);
console.log("Map created:", map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// import data
async function getData(url) {
  console.log("Fetching data from:", url);
  const response = await fetch(url);
  const data = await response.json();
  console.log("Data loaded:", data.length, "records");
  console.log("Sample data:", data[0]);
  return data;
}

const data = await getData("./data/data.json");

// Center the map on the data
const firstPoint = data[0];
console.log("First point:", firstPoint);
map.setView([firstPoint.lat, firstPoint.lon], 10);

// Check map state
console.log("Map center:", map.getCenter());
console.log("Map bounds:", map.getBounds());
console.log("Map size:", map.getSize());
console.log("Map zoom:", map.getZoom());

// Declare and add the gridded glyph layer
console.log("Creating GriddedGlyphLayer with options:", {
  data: data.length,
  getLocationFn: "(function)",
  cellSize: 35,
  discretisationShape: "grid"
});

const glyphLayer = new GriddedGlyphLayer({
  data: data,
  getLocationFn: (row) => [row.lon, row.lat],
  cellSize: 35,
  discretisationShape: "grid",
  
  glyph: {
    scaleParams: [
      _setupParamFns({
        name: "heightMaxV",
        decKey: "LEFT",
        decFn: (v) => v - v / 10,
        incKey: "RIGHT",
        incFn: (v) => v + v / 10,
        resetKey: "s",
        autoscale: true,
        resetFn: (cells) =>
          d3.max(
            cells.map((cell) =>
              cell && cell.ts ? d3.max(cell.ts.map((ts) => d3.max(ts))) : 0
            )
          ),
      }),
    ],

    initFn: (cells, cellSize, global, panel) => {
      console.log("initFn called with:", { cells: cells.length, cellSize, global, panel });
      global.numT = d3.max(panel.options.data.map((row) => row.ts.length));
      console.log("Global numT set to:", global.numT);
    },

    aggrFn: (cell, row, weight, global, panel) => {
      if (!cell.ts) cell.ts = [];
      cell.ts.push(row.ts);
      if (!cell.stations) cell.stations = [];
      if (!cell.stations.includes(row.name)) cell.stations.push(row.name);
    },

    preDrawFn: (cells, cellSize, ctx, global, panel) => {
      console.log("preDrawFn called with:", { cells: cells.length, cellSize, global });
      global.heightScale = d3
        .scaleLinear()
        .domain([0, global.heightMaxV])
        .range([0, cellSize])
        .clamp(true);
    },

    drawFn: (cell, x, y, cellSize, ctx, global, panel) => {
      console.log("drawFn called for cell:", { cell, x, y, cellSize });
      if (cell && cell.ts && !cell.new) {
        const padding = 4;
        const incX = (cellSize - padding * 2) / global.numT;
        const zoom = panel._map.getZoom();

        // --- Corrected Drawing Logic ---
        // The boundary points are relative to the cell, so we must translate
        // them to the cell's absolute position on the canvas.
        const boundary = cell.getBoundary(padding);
        const topLeftX = x - cellSize / 2;
        const topLeftY = y - cellSize / 2;

        // Draw cell background
        ctx.fillStyle = zoom >= 12 ? "black" : "#cccb";
        ctx.beginPath();
        ctx.moveTo(topLeftX + boundary[0][0], topLeftY + boundary[0][1]);
        for (let i = 1; i < boundary.length; i++) {
          ctx.lineTo(topLeftX + boundary[i][0], topLeftY + boundary[i][1]);
        }
        ctx.closePath();
        ctx.fill();

        // Draw time series lines within the cell
        for (const ts of cell.ts) {
          ctx.beginPath();
          ctx.strokeStyle = zoom >= 12 ? "red" : "#8557";
          for (let i = 0; i < ts.length; i++) {
            const lineX = x - cellSize / 2 + padding + incX * i;
            const lineY = y + cellSize / 2 - padding - global.heightScale(ts[i]);
            if (i === 0) {
                ctx.moveTo(lineX, lineY);
            } else {
                ctx.lineTo(lineX, lineY);
            }
          }
          ctx.stroke();
        }
      }
    },
    tooltipTextFn: (cell) => {
      return cell.stations ? cell.stations.join(', ') : "";
    },
  },
});

console.log("GlyphLayer created:", glyphLayer);

glyphLayer.addTo(map);
console.log("GlyphLayer added to map");