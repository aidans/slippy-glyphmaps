export function _kernelSmooth(options) {
  const grid = options.grid;
  const properties = options.properties;
  const propertyTypes = options.propertyTypes;
  if (properties === undefined || propertyTypes === undefined) {
    console.log("Need to define properties and propertyTypes for smoothing");
    return;
  }
  const discretiser = options.discretiser;
  const kernelRadius = options.kernelRadius;

  const numCols = grid.length + kernelRadius;
  const numRows =
    Math.max(...Object.values(grid.map((cols) => cols.length))) + kernelRadius;

  {
    //set up wMatrix
    const wMatrix = [];
    for (let kx = -kernelRadius; kx < kernelRadius; kx++) {
      for (let ky = -kernelRadius; ky < kernelRadius; ky++) {
        let dist;
        if (grid.type == "grid") {
          // if (grid.type) {
          // console.log("smoothing as grid");
          dist = Math.sqrt(Math.pow(kx, 2) + Math.pow(ky, 2));
        } else if (grid.type == "hex") {
          // console.log("smoothing as hex");
          const [x, y] = discretiser.getXYCentreCellUnits(0, 0);
          const [x1, y1] = discretiser.getXYCentreCellUnits(
            kx,
            kx < 0 ? ky : -ky
          );
          dist = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
          //console.log(kx, ky, x1, y1);
        }
        if (dist < kernelRadius) {
          var w = (kernelRadius - dist) / (kernelRadius + dist);
          if (!wMatrix[kx]) wMatrix[kx] = [];
          wMatrix[kx][ky] = w;
        }
      }
    }
    //console.log("wMatrix", wMatrix);

    for (let j = 0; j < properties.length; j++) {
      for (let x = 0; x < numCols; x++) {
        for (let y = 0; y < numRows; y++) {
          let cumW = 0;
          let newV = undefined;
          for (var kx = -kernelRadius; kx <= kernelRadius; kx++) {
            for (var ky = -kernelRadius; ky <= kernelRadius; ky++) {
              if (
                x + kx >= 0 &&
                x + kx < numCols &&
                y + ky >= 0 &&
                y + ky < numRows
              ) {
                if (propertyTypes[j] === "value") {
                  let v =
                    grid[x + kx] && grid[x + kx][y + ky]
                      ? grid[x + kx][y + ky][properties[j]]
                      : 0;
                  if (isNaN(v)) v = 0;
                  let w;
                  //for hex, ky needs to be adjusted in under some conditions
                  if (
                    grid.type == "hex" &&
                    x % 2 == 0 &&
                    (kx % 2 == 1 || kx % 2 == -1)
                  )
                    w = wMatrix[kx] ? wMatrix[kx][ky + 1] : 0;
                  //grid and other hex conditions
                  else w = wMatrix[kx] ? wMatrix[kx][ky] : 0;

                  if (w > 0) {
                    newV = newV ? newV + v * w : v * w;
                    cumW = cumW ? cumW + w : w;
                  }
                } //
                else if (propertyTypes[j] === "array") {
                  let array =
                    grid[x + kx] &&
                    grid[x + kx][y + ky] &&
                    grid[x + kx][y + ky][properties[j]]
                      ? grid[x + kx][y + ky][properties[j]]
                      : [];
                  let w;
                  //for hex, ky needs to be adjusted in under some conditions
                  if (
                    grid.type == "hex" &&
                    x % 2 == 0 &&
                    (kx % 2 == 1 || kx % 2 == -1)
                  )
                    w = wMatrix[kx] ? wMatrix[kx][ky + 1] : 0;
                  //grid and other hex conditions
                  else w = wMatrix[kx] ? wMatrix[kx][ky] : 0;

                  if (w > 0) {
                    cumW = cumW ? cumW + w : w;
                    for (let i = 0; i < array.length; i++) {
                      let v = array[i];
                      if (!v) v = 0;
                      if (isNaN(v)) v = 0;
                      if (!newV) newV = [];
                      //console.log(properties[j], i, newV, newV[i], v, w);
                      newV[i] =
                        newV[i] !== undefined && newV[i]
                          ? newV[i] + v * w
                          : v * w;
                    }
                  }
                }
              } //
            }
          }

          if (!grid[x]) grid[x] = [];

          for (let j = 0; j < properties.length; j++) {
            if (propertyTypes[j] === "value") {
              if (newV / cumW > 0) {
                //create new cell if one doesn't exist
                if (!grid[x][y])
                  grid[x][y] = {
                    getBoundary: () => discretiser.getBoundary(x, y),
                    getXCentre: () =>
                      discretiser.getXYCentre(x, y)[0] + grid.xOffset,
                    getYCentre: () =>
                      discretiser.getXYCentre(x, y)[1] + grid.yOffset,
                    getCellSize: () => discretiser.getCellSize(),
                    new: true,
                  };

                grid[x][y]["_" + properties[j]] = newV / cumW;
              }
            } else if (propertyTypes[j] === "array") {
              if (newV) {
                for (let i = 0; i < newV.length; i++) {
                  if (newV[i] / cumW > 0) {
                    //create new cell if one doesn't exist
                    if (!grid[x][y])
                      grid[x][y] = {
                        getBoundary: () => discretiser.getBoundary(x, y),
                        getXCentre: () =>
                          discretiser.getXYCentre(x, y)[0] + grid.xOffset,
                        getYCentre: () =>
                          discretiser.getXYCentre(x, y)[1] + grid.yOffset,
                        getCellSize: () => discretiser.getCellSize(),
                        new: true,
                      };

                    if (!grid[x][y]["_" + properties[j]])
                      grid[x][y]["_" + properties[j]] = [];
                    grid[x][y]["_" + properties[j]][i] = newV[i] / cumW;
                  }
                }
              }
            }
          }
        }
      }
    }
    for (let cell of grid.flat()) {
      for (let j = 0; j < properties.length; j++) {
        if (cell["_" + properties[j]] !== undefined)
          cell[properties[j]] = cell["_" + properties[j]];
      }
    }
  }
}
