import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import {glyphMap, heatmapGlyph} from './dist/index.min.js';


// import data
async function getData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

const data = await getData('./data/data.json');

// Declare glyphmap
const container = glyphMap({
    data: data,
    getLocationFn: (row) => [row.lon, row.lat],
    cellSize: 3,
    interactiveCellSize: true,
    interactiveKernelBW: true,
    kernelBW: 5,
    useBlur: true,

    width: window.innerWidth - 40,
    height: window.innerHeight - 100,
    tileWidth: 150,
    greyscale: true,

    glyph: heatmapGlyph({
        valueFn: (row, global) => row.ts[row.ts.length - 1],
        type: "mean",
        colourScheme: d3.scaleSequential(d3.interpolatePurples),
        colourAutoscale: true,
        useTransparency: true,
        showLegend: false,
        numberFormatFn: (value) => +value.toFixed(3)
    })
})

const canvas = container.querySelector('canvas');

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth - 40;
  canvas.height = window.innerHeight - 100;
});


document.body.appendChild(container);