import * as d3 from "d3";

export function _blur(options) {
  const grid = options.grid;
  const discretiser = options.discretiser;
  const properties = options.properties;
  const propertyTypes = options.propertyTypes;
  if (properties === undefined || propertyTypes === undefined) {
    console.log("Need to define properties and propertyTypes for smoothing");
    return;
  }
  const kernelRadius = options.kernelRadius;

  const numCols = grid.length + kernelRadius;
  const numRows =
    Math.max(...Object.values(grid.map((cols) => cols.length))) + kernelRadius;

  {
    for (let j = 0; j < properties.length; j++) {
      if (propertyTypes[j] === "value") {
        const vs = [];
        for (let y = 0; y < numRows; y++) {
          for (let x = 0; x < numCols; x++) {
            vs.push(
              grid[x] && grid[x][y] && grid[x][y][properties[j]]
                ? grid[x][y][properties[j]]
                : 0
            );
          }
        }
        d3.blur2({ data: vs, width: numCols, height: numRows }, kernelRadius);
        for (let x = 0; x < numCols; x++) {
          for (let y = 0; y < numRows; y++) {
            const v = vs[x + y * numCols];
            if (v > 0) {
              if (!grid[x]) grid[x] = [];
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
              grid[x][y][properties[j]] = v;
            } else {
              if (grid[x] && grid[x][y] && grid[x][y][properties[j]])
                grid[x][y][properties[j]] = v;
            }
          }
        }
      }
    }
  }
  return grid;
}
