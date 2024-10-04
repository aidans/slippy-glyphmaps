import { _drawLegend } from "./drawlegend.js";
import { _blur } from "./blur.js";
import { _getGridDiscretiser } from "./griddiscretizer.js";
import { _getHexDiscretiser } from "./hexdiscretizer.js";
import { _generate2DHeatMap } from "./heatmap2d.js";
import { _setupParamFns } from "./setupparamfns.js";
import { _drawCellBackground } from "./drawcellbackground.js";
import { slippyMap } from "./slippy/slippymaps.js";
import { _kernelSmooth } from "./kernelsmooth.js";
import { heatmapGlyph } from "./heatmapglyphtype.js";
import {createDiscretiserValue} from "./creategriddiscretizer.js";
import * as d3 from "d3";

function glyphMap(options) {
  //sort this out later (used values above)
  const data = options.data;
  const width = options.width ? options.width : 600;
  const height = options.height ? options.height : 300;
  //values to eventually go in properties
  const colourFieldFn = options.colourFieldFn
    ? options.colourFieldFn
    : (row) => row.value;
  const type = options.type ? options.type : "mean";
  let cellSize = options.cellSize ? options.cellSize : 5;
  let discretisationMode = options.discretisationMode
    ? options.discretisationMode
    : "relativeToScreen";
  let discretisationShape = options.discretisationShape
    ? options.discretisationShape
    : "grid";
  let kernelBW = options.kernelBW;
  let getLocationFn = options.getLocationFn
    ? options.getLocationFn
    : (row) => [row.lon, row.lat];
  const tooltip = true;
  const autoColourScale = options.autoColourScale;
  const showLegend =
    options.showLegend || options.showLegend === false
      ? options.showLegend
      : false;
  let colourMax = undefined;
  const useTransparency = options.useTransparency
    ? options.useTransparency
    : true;
  const colourScale = options.colourScale
    ? options.colourScale
    : d3.scaleSequential(d3.interpolateYlGn);
  const interactiveZoomPan =
    options.interactiveZoomPan !== undefined
      ? options.interactiveZoomPan
      : true;
  const interactiveColourScaling = options.interactiveColourScaling;
  const interactiveCellSize = options.interactiveCellSize;
  const interactiveKernelBW = options.interactiveKernelBW;
  const drawSamplePoints = options.drawSamplePoints
    ? options.drawSamplePoints
    : false;
  let reduceMaup =
    options.reduceMaup !== undefined ? options.reduceMaup : false;

  if (!options.initialBB) {
    const coords = data.map(getLocationFn);
    const xExtent = d3.extent(coords.map((coord) => +coord[0]));
    const yExtent = d3.extent(coords.map((coord) => +coord[1]));
    options.initialBB = [xExtent[0], yExtent[0], xExtent[1], yExtent[1]];
    console.log("initialBB", options.initialBB, xExtent, yExtent);
  }

  let discretiserFn = options.discretiserFn
    ? options.discretiserFn
    : _generate2DHeatMap;

  const useBlur = options.useBlur ?? false;

  let kernelSmoothProperties;
  let kernelSmoothPropertyTypes;

  let alwaysReaggregate = false; //if true, always reaggregate, even if zoom/pan/cellsize/kernel not changes (useful for animate)
  let flags = {}; //temporary flags - reset when drawn once
  flags.reaggregate = false;

  let offSetMaupMode =
    options.offSetMaupMode !== undefined ? options.offSetMaupMode : false;

  const global = {};
  let scaleParams;
  let initFn;
  let preAggrFn;
  let aggrFn;
  let postAggrFn;
  let postKernelSmoothFn;
  let preDrawFn;
  let drawFn;
  let postDrawFn;
  let tooltipTextFn;
  let showScaleParams = false;

  if (options.customMap) {
    //deprecated
    options.glyph = options.customMap;
  }
  if (options.glyph) {
    if (options.glyph.kernelSmoothProperties)
      kernelSmoothProperties = options.glyph.kernelSmoothProperties;
    if (options.glyph.kernelSmoothPropertyTypes)
      kernelSmoothPropertyTypes = options.glyph.kernelSmoothPropertyTypes;

    scaleParams = options.glyph.scaleParams;
    initFn = options.glyph.initFn;
    preAggrFn = options.glyph.preAggrFn;
    aggrFn = options.glyph.aggrFn;
    postAggrFn = options.glyph.postAggrFn;
    postKernelSmoothFn = options.glyph.postKernelSmoothFn;
    preDrawFn = options.glyph.preDrawFn;
    drawFn = options.glyph.drawFn;
    postDrawFn = options.glyph.postDrawFn;
    tooltipTextFn = options.glyph.tooltipTextFn;
  } else if (type == "count")
    aggrFn = (cell, row, weight) => (cell.value = (cell.value ?? 0) + weight);
  //count
  else if (type == "sum") {
    //assume weight will be 0-1
    aggrFn = (cell, row, weight) =>
      (cell.value = (cell.value ?? 0) + colourFieldFn(row) * weight); //sum
  } else if (type == "mean") {
    aggrFn = (cell, row, weight) => {
      //assume weight will be 0-1
      //console.log(colourFieldFn(row));
      cell.sum = (cell.sum ?? 0) + colourFieldFn(row) * weight;
      cell.count = (cell.count ?? 0) + 1;
    };
    postAggrFn = (cells, panel) => {
      for (const cell of cells.flat()) {
        if (cell && cell.count > 0) cell.value = cell.sum / cell.count;
      }
    };
  }

  let discretiser;

  const panel = slippyMap(options);
  let offSetCoordRef = [0, 0];
  panel.setOnPanFn((e) => {
    //console.log("onpan",e);
    offSetCoordRef = panel.screenToCoord([e.offsetX, e.offsetY]);
  });
  panel.setOnZoomFn((e) => {
    offSetCoordRef = panel.screenToCoord([e.offsetX, e.offsetY]);
  });

  panel.data = data;
  if (options.setup) options.setup(panel, global);

  //tooltip
  if (tooltipTextFn) {
    const tooltipDiv = document.createElement("div");
    tooltipDiv.style.width = "auto";
    tooltipDiv.style.height = "auto";
    tooltipDiv.style.float = "left";
    tooltipDiv.style.position = "absolute";
    tooltipDiv.style.left = "10px";
    tooltipDiv.style.top = "10px";
    //tooltipDiv.style.display = "inline-block";
    //tooltipDiv.style.border = "1px solid #0009";
    tooltipDiv.style.padding = "2px";
    tooltipDiv.style.fontSize = "10pt";
    tooltipDiv.style.backgroundColor = "#dfd28977";
    tooltipDiv.style.pointerEvents = "none";
    tooltipDiv.style.visibility = "hidden";
    panel.appendChild(tooltipDiv);
    panel.addEventListener("mousemove", (e) => {
      const localGrid = grid;
      if (grid && discretiser) {
        const [col, row] = discretiser.getColRow(
          e.offsetX - grid.xOffset,
          e.offsetY - grid.yOffset
        );
        if (
          col > 0 &&
          row > 0 &&
          col < localGrid.length &&
          row < (localGrid[col] ? localGrid[col].length : 0) &&
          localGrid[col] &&
          localGrid[col][row]
        ) {
          tooltipDiv.style.visibility = "visible";
          tooltipDiv.innerHTML = tooltipTextFn(
            localGrid[col][row],
            global,
            panel
          );
          tooltipDiv.style.left = e.offsetX + 10 + "px";
          tooltipDiv.style.top = e.offsetY + 20 + "px";
          //console.log(localGrid[col][row]);
        } else {
          tooltipDiv.style.visibility = "hidden";
        }
      }
    });
  }

  if (interactiveColourScaling || interactiveCellSize) {
    panel.tabIndex = "0"; //makes it keyboard focussable
    panel.addEventListener("keydown", (event) => {
      let redrawAtEnd = false;
      if (interactiveColourScaling && event.keyCode == 37) {
        event.preventDefault();
        //LEFT
        colourMax += colourMax / 10;
        redrawAtEnd = true;
      }
      if (interactiveColourScaling && event.keyCode == 39) {
        event.preventDefault();
        //RIGHT
        if (colourMax - colourMax / 10 > 0) colourMax -= colourMax / 10;
        redrawAtEnd = true;
      }
      if (interactiveColourScaling && event.key == "s") {
        event.preventDefault();
        colourMax = undefined;
        redrawAtEnd = true;
      }
      if (
        interactiveCellSize &&
        event.keyCode == 38 &&
        !event.shiftKey //UP
      ) {
        event.preventDefault();
        cellSize++;
        redrawAtEnd = true;
      }
      if (
        interactiveCellSize &&
        event.keyCode == 40 &&
        !event.shiftKey //DOWN
      ) {
        event.preventDefault();
        cellSize--;
        redrawAtEnd = true;
      }
      if (
        interactiveKernelBW &&
        event.keyCode == 38 &&
        event.shiftKey //UP
      ) {
        event.preventDefault();
        kernelBW++;
        redrawAtEnd = true;
      }
      if (
        interactiveKernelBW &&
        event.keyCode == 40 &&
        event.shiftKey //DOWN
      ) {
        event.preventDefault();
        kernelBW--;
        redrawAtEnd = true;
      }

      if (event.key == "m") {
        event.preventDefault();
        reduceMaup = !reduceMaup;
        redrawAtEnd = true;
      }

      if (event.key == "h") {
        event.preventDefault();
        showScaleParams = !showScaleParams;
        redrawAtEnd = true;
      }

      if (redrawAtEnd) panel.redraw();
    });
  }

  let grid = [];

  //--start public methods
  panel.redraw();

  panel.setOptions = (newOptions) => {
    for (const key of Object.keys(newOptions))
      if (typeof newOptions[key] === "string")
        eval(key + "=" + '"' + newOptions[key] + '"');
      else eval(key + "=" + newOptions[key]);
    flags.reaggregate = true;
    panel.redraw();
  };

  panel.setData = (data) => {
    panel.data = data;
    flags.reaggregate = true;
    panel.redraw();
  };

  panel.setGlyph = (glyph) => {
    if (glyph.kernelSmoothProperties)
      kernelSmoothProperties = glyph.kernelSmoothProperties;
    if (glyph.kernelSmoothPropertyTypes)
      kernelSmoothPropertyTypes = glyph.kernelSmoothPropertyTypes;

    if (glyph.scaleParams) scaleParams = glyph.scaleParams;
    if (glyph.discretiserFn) discretiserFn = glyph.discretiserFn;
    if (glyph.initFn) initFn = glyph.initFn;
    if (glyph.preAggrFn) preAggrFn = glyph.preAggrFn;
    if (glyph.aggrFn) aggrFn = glyph.aggrFn;
    if (glyph.postAggrFn) postAggrFn = glyph.postAggrFn;
    if (glyph.postKernelSmoothFn) postKernelSmoothFn = glyph.postKernelSmoothFn;
    if (glyph.preDrawFn) preDrawFn = glyph.preDrawFn;
    if (glyph.drawFn) drawFn = glyph.drawFn;
    if (glyph.postDrawFn) postDrawFn = glyph.postDrawFn;
    if (glyph.tooltipTextFn) tooltipTextFn = glyph.tooltipTextFn;

    flags.reaggregate = true;
    panel.redraw();
  };

  panel.getCoordBBInView = () => {
    const topLeftCoord = panel.screenToCoord([0, height]);
    const bottomRightCoord = panel.screenToCoord([width, 0]);
    return [
      topLeftCoord[0],
      topLeftCoord[1],
      bottomRightCoord[0],
      bottomRightCoord[1],
    ];
  };

  //depreccated
  panel.getCoordBB = panel.getCoordBBInView;

  panel.getDataInView = () => {
    const topLeftCoord = panel.screenToCoord([0, height]);
    const bottomRightCoord = panel.screenToCoord([width, 0]);
    return data.filter((row) => {
      const location = getLocationFn(row);
      return (
        location[0] >= topLeftCoord[0] &&
        location[0] <= bottomRightCoord[0] &&
        location[1] >= topLeftCoord[1] &&
        location[1] <= bottomRightCoord[1]
      );
    });
  };

  //it true will already reaggregate (usual for animation)
  panel.setAlwaysReaggregate = (flag) => {
    alwaysReaggregate = flag;
  };
  //--end public methods

  if (initFn) initFn(grid.flat(), cellSize, global, panel);

  if (scaleParams) {
    for (const scaleParam of scaleParams)
      scaleParam.initFn(grid.flat(), cellSize, global, panel);
  }

  panel.addEventListener("click", (event) => {
    if (showScaleParams) {
      let c = 0;
      console.log("click", event);
      for (const scaleParam of scaleParams) {
        if (event.offsetY > c * 10 + 5 && event.offsetY < (c + 1) * 10 + 5) {
          if (!scaleParam.getAutoscale()) {
            if (event.offsetX > 0 + 5 && event.offsetX < 10 + 5)
              scaleParam.doDec(global, panel);
            if (event.offsetX > 10 + 5 && event.offsetX < 20 + 5)
              scaleParam.doReset(global, panel);
            if (event.offsetX > 20 + 5 && event.offsetX < 30 + 5)
              scaleParam.doInc(global, panel);
          }
          if (event.offsetX > 30 + 5 && event.offsetX < 40 + 5) {
            scaleParam.toggleAutoscale();
            panel.redraw();
          }
        }
        c++;
      }
    }
  });

  let previousTransform;
  let previousCellSize;
  let previousKernelBW;
  let previousMaupReduce;
  //this is called by the slippymap panel everytime the mouse moves
  panel.addDrawFn(function (div, e) {
    global.mouseX = e && e.offsetX ? e.offsetX : undefined;
    global.mouseY = e && e.offsetY ? e.offsetY : undefined;

    let needToRedicretise = false;
    const transform = panel.getTransform();
    if (
      flags.reaggregate ||
      alwaysReaggregate ||
      !previousTransform ||
      previousTransform.x != transform.x ||
      previousTransform.y != transform.y ||
      previousTransform.z != transform.z ||
      previousCellSize !== cellSize ||
      previousKernelBW !== kernelBW ||
      previousMaupReduce !== reduceMaup
    ) {
      flags.reaggregate = false;
      needToRedicretise = true;
      if (!discretiser || previousCellSize != cellSize) {
        if (discretisationShape == "grid")
          discretiser = _getGridDiscretiser(cellSize);
        else if (discretisationShape == "hex")
          discretiser = _getHexDiscretiser(cellSize);
        else return "Invalid discretisationShape";
      }
      global.discretiser = discretiser;

      if (scaleParams)
        for (const scaleParam of scaleParams)
          if (scaleParam.preAggrFn)
            scaleParam.preAggrFn(
              grid.flat(),
              cellSize,
              panel.ctx,
              global,
              panel
            );

      grid = discretiserFn({
        data: panel.data,
        width,
        height,
        getLocationFn,
        coordToScreenFn: (coord) => panel.coordToScreen(coord),
        screenToCoordFn: (coord) => panel.screenToCoord(coord),
        cellSize,
        discretiser,
        preAggrFn,
        global,
        aggrFn,
        postAggrFn,
        getLocationFn,
        offSetCoordRef,
        discretisationMode,
        reduceMaup,
        panel,
        offSetMaupMode,
      });
      previousTransform = transform;
      previousCellSize = cellSize;
      previousKernelBW = kernelBW;
      previousMaupReduce = reduceMaup;
      //console.log("recalced grid");

      if (kernelBW && kernelBW > 0) {
        //console.log("Smoothing...");
        if (useBlur)
          _blur({
            grid: grid,
            properties: kernelSmoothProperties,
            propertyTypes: kernelSmoothPropertyTypes,
            discretiser,
            kernelRadius: Math.trunc(kernelBW / 2),
          });
        else
          _kernelSmooth({
            grid: grid,
            properties: kernelSmoothProperties,
            propertyTypes: kernelSmoothPropertyTypes,
            discretiser,
            kernelRadius: kernelBW,
          }); //console.log("done.");
      }
    } else {
      //console.log("didn't recalc grid");
    }

    if (global.mouseX && global.mouseY) {
      const [col, row] = discretiser.getColRow(
        global.mouseX - grid.xOffset,
        global.mouseY - grid.yOffset
      );
      if (
        col > 0 &&
        row > 0 &&
        col < grid.length &&
        row < (grid[col] ? grid[col].length : 0) &&
        grid[col] &&
        grid[col][row]
      )
        global.mouseCell = grid[col][row];
      else global.mouseCell = undefined;
    } else global.mouseCell = undefined;

    if (postKernelSmoothFn)
      postKernelSmoothFn(grid.flat(), cellSize, global, panel);

    if (autoColourScale || !colourMax) {
      resetColourScaling();
    }
    //panel.ctx.clearRect(0, 0,width, height);

    if (scaleParams)
      for (const scaleParam of scaleParams)
        if (scaleParam.preDrawFn) {
          panel.ctx.save();
          scaleParam.preDrawFn(grid.flat(), cellSize, panel.ctx, global, panel);
          panel.ctx.restore();
        }

    if (preDrawFn) {
      panel.ctx.save();
      preDrawFn(grid.flat(), cellSize, panel.ctx, global, panel);
      panel.ctx.restore();
    }
    //console.log(grid);
    if (drawFn) {
      panel.ctx.save();
      // for (let col=0;col<grid.length;col++){
      //   for (let row=0;row<(grid[col]?grid[col].length:0);row++){
      //     const xYCentre=discretiser.getXYCentre(col,row);
      //     drawFn(grid[col][row], xYCentre[0]+ grid.xOffset, xYCentre[1]+ grid.yOffset, cellSize, panel.ctx,global,panel);
      //   }
      for (const spatialUnit of grid.flat()) {
        drawFn(
          spatialUnit,
          spatialUnit.getXCentre() + grid.xOffset ?? 0,
          spatialUnit.getYCentre() + grid.yOffset ?? 0,
          cellSize,
          panel.ctx,
          global,
          panel
        );
      }
      panel.ctx.restore();
    }
    // else{
    //   _draw2DHeatMap({
    //     context: panel.ctx,
    //     grid,
    //     property: "value",
    //     cellSize: cellSize,
    //     colourMax,
    //     colourScale: colourScale,
    //     useTransparency:true
    //   });
    // }
    if (drawSamplePoints) {
      for (let datum of data) {
        const screenXY = panel.coordToScreen(getLocationFn(datum));
        panel.ctx.fillStyle = "#000";
        panel.ctx.fillRect(screenXY[0], screenXY[1], 2, 2);
      }
    }

    if (postDrawFn) {
      panel.ctx.save();
      postDrawFn(grid.flat(), cellSize, panel.ctx, global, panel);
      panel.ctx.restore();
    }

    //draw params

    //console.log("scaleParams="+scaleParams);

    //draw scaleParams
    if (scaleParams) {
      if (showScaleParams) {
        const labels = [];
        for (const scaleParam of scaleParams) {
          let s =
            scaleParam.name +
            ": " +
            scaleParam.numberFormatFn(global[scaleParam.name]);
          if (scaleParam.decKey || scaleParam.incKey || scaleParam.resetKey)
            s +=
              " (" +
              (scaleParam.decKey ? scaleParam.decKey : "<none>") +
              "/" +
              (scaleParam.incKey ? scaleParam.incKey : "<none>") +
              "/" +
              (scaleParam.resetKey ? scaleParam.resetKey : "<none>") +
              ")";
          labels.push(s);
        }

        const panelW =
          40 + d3.max(labels.map((s) => panel.ctx.measureText(s).width)) + 5;
        panel.ctx.fillStyle = "#fff";
        panel.ctx.fillRect(0, 0, panelW, scaleParams.length * 10 + 5 + 5);
        let c = 0;
        //panel.ctx.fillStyle="#000";
        panel.ctx.font = "10px";
        panel.ctx.textBaseline = "top";
        for (const scaleParam of scaleParams) {
          panel.ctx.fillStyle = "#aaa";
          panel.ctx.strokeStyle = "#aaa";
          if (!scaleParam.getAutoscale()) {
            panel.ctx.fillRect(0 + 5, c * 10 + 5 + 1, 9, 8);
            panel.ctx.fillRect(10 + 5, c * 10 + 5 + 1, 9, 8);
            panel.ctx.fillRect(20 + 5, c * 10 + 5 + 1, 9, 8);
          }
          if (scaleParam.getAutoscale())
            panel.ctx.fillRect(30 + 5, c * 10 + 5 + 1, 9, 8);
          else panel.ctx.strokeRect(30 + 5, c * 10 + 5 + 1, 9, 8);

          panel.ctx.fillStyle = "#333";
          panel.ctx.textAlign = "center";
          if (!scaleParam.getAutoscale()) {
            panel.ctx.fillText("<", 5 + 5, c * 10 + 5);
            panel.ctx.fillText(">", 25 + 5, c * 10 + 5);
          }
          panel.ctx.fillText("A", 35 + 5, c * 10 + 5);
          panel.ctx.fillStyle = "#333";
          panel.ctx.textAlign = "left";
          panel.ctx.fillText(labels[c], 50, c * 10 + 5);
          c++;
        }
      }
    }

    if (showLegend) {
      _drawLegend({
        context: panel.ctx,
        values: grid.flat().map((item) => (item ? item.value : NaN)),
        minV: 0,
        maxV: colourMax,
        numBins: 20,
        x: width - 160,
        y: height - 60,
        width: 150,
        height: 50,
        colourScale,
      });
    }
    function resetColourScaling() {
      // console.log("flat",grid.flat().map( (datum) =>
      //     (datum&&datum["value"] ? datum["value"] : NaN
      // )));
      colourMax = d3.max(grid.flat(), (datum) =>
        datum && datum["value"] ? datum["value"] : NaN
      );
      if (!colourMax) colourMax = 0;
      //console.log("Rescaled colour to ",colourMax);
    }
  });

  //public method are higher up, commented "--start public methods"

  return panel;
}

export {
  _drawLegend,
  _blur,
  _getGridDiscretiser,
  _getHexDiscretiser,
  _generate2DHeatMap,
  _drawCellBackground,
  _setupParamFns,
  _kernelSmooth,
  glyphMap,
  slippyMap,
  createDiscretiserValue,
  heatmapGlyph,
};
