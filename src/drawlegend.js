import * as d3 from "d3"; 

export const _drawLegend = function (options) {
    const numBins = options.numBins;
    const context = options.context;
    const minV = options.minV;
    const maxV = options.maxV;
    const values = options.values;
    const x = options.x;
    const y = options.y;
    const width = options.width;
    const height = options.height;
    const colourScale = options.colourScale;
  
    const bins = Array(numBins + 2).fill(0); //+2 2 for overflow bins
    const binSize = (maxV - minV) / bins.length;
    for (const v of values) {
      if (v) {
        const binIdx = Math.trunc((v - minV) / binSize) + 1;
        if (binIdx < 1) bins[0]++;
        else if (binIdx > bins.length - 2) bins[bins.length - 1]++;
        else bins[binIdx]++;
      }
    }
    const maxBinV = Math.max(...bins.slice(1, -2));
    const hScale = d3
      .scaleLinear()
      .domain([0, maxBinV])
      .range([0, height - 30]);
    const binPixelW = width / bins.length;
    context.fillStyle = "#fff8";
    context.fillRect(x, y, width, height);
    for (let i = 0; i < bins.length; i++) {
      context.fillStyle = colourScale(i / bins.length);
      context.fillRect(x + i * binPixelW, y + height - 10, binPixelW, -10);
      if (i == 0) context.fillStyle = colourScale(0);
      else if (i == bins.length - 1) context.fillStyle = colourScale(1);
      else context.fillStyle = colourScale(0.5);
      context.fillRect(
        x + i * binPixelW,
        y + height - 20,
        binPixelW,
        -Math.min(hScale(bins[i]), height - 20)
      );
    }
    context.fillStyle = "#000";
    context.font = "sans-serif 8pt";
    context.textBaseline = "bottom";
    context.textAlign = "left";
    context.fillText(
      minV.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      }),
      x + binPixelW,
      y + height
    );
    context.textAlign = "right";
    context.fillText(
      maxV.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      }),
      x + width - binPixelW,
      y + height
    );
  }

