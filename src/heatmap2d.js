export const _generate2DHeatMap = function (options) {
  const data = options.data;
  const width = options.width;
  const height = options.height;
  const cellSize = options.cellSize;
  const getLocationFn = options.getLocationFn;
  const coordToScreenFn = options.coordToScreenFn;
  const screenToCoordFn = options.screenToCoordFn;
  const preAggrFn = options.preAggrFn;
  const aggrFn = options.aggrFn;
  const postAggrFn = options.postAggrFn;
  const offSetCoordRef = options.offSetCoordRef;
  const discretisationMode = options.discretisationMode;
  const reduceMaup = options.reduceMaup;
  const panel = options.panel;
  const discretiser = options.discretiser;
  const numCols = Math.trunc(width / cellSize);
  const numRows = Math.trunc(height / cellSize);
  const global = options.global;
  const offSetMaupMode = options.offSetMaupMode;
  let grid = [];
  // let grid = Array(numCols)
  //   .fill()
  //   .map(() => Array(numRows).fill());

  if (discretisationMode == "relativeToMouse") {
    grid.xOffset = Math.trunc(coordToScreenFn(offSetCoordRef)[0] % cellSize);
    grid.yOffset = Math.trunc(coordToScreenFn(offSetCoordRef)[1] % cellSize);
  } else {
    grid.xOffset = 0;
    grid.yOffset = 0;
  }
  grid.type = discretiser.type;
  grid.cellSize = cellSize;

  const topLeftCoord = screenToCoordFn([0, height]);
  const bottomRightCoord = screenToCoordFn([width, 0]);

  if (preAggrFn) {
    preAggrFn(grid.flat(), cellSize, global, panel);
  }
  for (let datum of data) {
    const colRows = [];
    const location = getLocationFn(datum);
    if (location.type) {
      //assume it's a feature
      const featBB = turf.bbox(location);
      const topLeftBB = coordToScreenFn([featBB[0], featBB[1]]);
      const bottomRightBB = coordToScreenFn([featBB[2], featBB[3]]);
      for (
        let x = Math.trunc(topLeftBB[0] / cellSize);
        x < bottomRightBB[0] / cellSize;
        x++
      ) {
        for (
          let y = Math.trunc(topLeftBB[1] / cellSize);
          y < bottomRightBB[1] / cellSize;
          y++
        ) {
          colRows.push([x, y]);
        }
      }
      if (colRows.length == 0) {
        const centroid = turf.centroid(location);
        colRows.push([
          Math.trunc(centroid[0] / cellSize),
          Math.trunc(centroid[1] / cellSize),
        ]);
      }
    }
    //it's a point
    else {
      const screenXY = coordToScreenFn(location);
      //console.log(reduceMaup);
      if (!reduceMaup) {
        if (offSetMaupMode) {
          for (let xOff = 0; xOff < cellSize; xOff += 3) {
            for (let yOff = 0; yOff < cellSize; yOff += 3) {
              colRows.push([
                ...discretiser.getColRow(
                  screenXY[0] + (xOff - cellSize / 2) - grid.xOffset,
                  screenXY[1] + (xOff - cellSize / 2) - grid.yOffset
                ),
                yOff * cellSize + xOff,
              ]);
            }
          }
        }
        colRows.push(
          discretiser.getColRow(
            screenXY[0] - grid.xOffset,
            screenXY[1] - grid.yOffset
          )
        );
      }
      //reducemaup
      else {
        console.log("mauping");
        const colRow = discretiser.getColRow(
          screenXY[0] - grid.xOffset,
          screenXY[1] - grid.yOffset
        );
        const distX = screenXY[0] - grid.xOffset - colRow[0] * cellSize;
        const distY = screenXY[1] - grid.yOffset - colRow[1] * cellSize;
        //weights will be -ve/+ve depending on which side and range from 0.5 (edge) to 0 (middle)
        let xWeight = distX / cellSize;
        if (xWeight < 0.5) {
          xWeight = -(0.5 - xWeight);
        } else {
          xWeight = xWeight - 0.5;
        }
        let yWeight = distY / cellSize;
        if (yWeight < 0.5) {
          yWeight = -(0.5 - yWeight);
        } else {
          yWeight = yWeight - 0.5;
        }
        //This sample
        colRows.push([
          colRow[0],
          colRow[1],
          1 - (Math.abs(xWeight) + Math.abs(yWeight)) / 2, //average x/y weight
          //1 - Math.abs(xWeight)
        ]);
        //The sample in the diagonal corner
        colRows.push([
          colRow[0] + (xWeight < 0 ? -1 : 1),
          colRow[1] + (yWeight < 0 ? -1 : 1),
          (Math.abs(xWeight) + Math.abs(yWeight)) / 2, //average x/y weight
        ]);
        //The sample to the left/right
        colRows.push([
          colRow[0] + (xWeight < 0 ? -1 : 1),
          colRow[1],
          Math.abs(xWeight), //x weight
        ]);
        //The sample to the top/bottom
        colRows.push([
          colRow[0],
          colRow[1] + (yWeight < 0 ? -1 : 1),
          Math.abs(yWeight), //y weight
        ]);
      }
    }
    // console.log(points.length);
    for (const colRow of colRows) {
      //console.log(point[0], point[1]);
      if (
        // colRow[0] >= 0 &&
        // colRow[0] < numCols &&
        // colRow[1] >= 0 &&
        // colRow[1] < numRows
        true
      ) {
        if (!grid[colRow[0]]) grid[colRow[0]] = [];
        if (!grid[colRow[0]][colRow[1]]) {
          const col = colRow[0];
          const row = colRow[1];
          grid[col][row] = {
            col: col,
            row: row,
            getBoundary: (padding) =>
              discretiser.getBoundary(col, row, padding),
            getXCentre: () =>
              discretiser.getXYCentre(col, row)[0] + grid.xOffset,
            getYCentre: () =>
              discretiser.getXYCentre(col, row)[1] + grid.yOffset,
            getCellSize: () => cellSize,
          };
        }
        if (aggrFn)
          if (!Array.isArray(aggrFn))
            if (offSetMaupMode) {
              aggrFn(
                grid[colRow[0]][colRow[1]],
                { ...datum, maupMode: colRow[2] },
                1, //don't bother with weight for now
                global,
                panel
              );
            } else
              aggrFn(
                grid[colRow[0]][colRow[1]],
                datum,
                colRow[2] ? colRow[2] : 1,
                global,
                panel
              );
          //provide the weight (or 1)
          //console.log(point[0], point[1], grid[point[0]][point[0]]);
          else
            for (const aggrFn1 of aggrFn)
              if (aggrFn1)
                aggrFn1(
                  grid[colRow[0]][colRow[1]],
                  datum,
                  colRow[2] ? colRow[2] : 1,
                  global,
                  panel
                );
      }
    }
  }

  if (postAggrFn) {
    postAggrFn(grid.flat(), cellSize, global, panel);
  }

  //console.log(grid);
  return grid;
};
