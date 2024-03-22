export const _getGridDiscretiser = function (cellSize) {
  const discretiser = {
    getColRow: (x, y) => [Math.trunc(x / cellSize), Math.trunc(y / cellSize)],
    getXYCentre: (col, row) => [
      col * cellSize + cellSize / 2,
      row * cellSize + cellSize / 2,
    ],
    getBoundary: (col, row, padding) => {
      const adjCellSize = padding ? cellSize - padding * 2 : cellSize;
      const xy = [col * cellSize + cellSize / 2, row * cellSize + cellSize / 2];
      return [
        [xy[0] - adjCellSize / 2, xy[1] - adjCellSize / 2],
        [xy[0] + adjCellSize / 2, xy[1] - adjCellSize / 2],
        [xy[0] + adjCellSize / 2, xy[1] + adjCellSize / 2],
        [xy[0] - adjCellSize / 2, xy[1] + adjCellSize / 2],
      ];
    },
    getBoundaryScreenCoord: (x, y, padding) => {
      const adjCellSize = padding ? cellSize - padding * 2 : cellSize;
      const xy = [x, y];
      return [
        [xy[0] - adjCellSize / 2, xy[1] - adjCellSize / 2],
        [xy[0] + adjCellSize / 2, xy[1] - adjCellSize / 2],
        [xy[0] + adjCellSize / 2, xy[1] + adjCellSize / 2],
        [xy[0] - adjCellSize / 2, xy[1] + adjCellSize / 2],
      ];
    },
    getCellSize: () => cellSize,
    type: "grid",
  };
  return discretiser;
};
