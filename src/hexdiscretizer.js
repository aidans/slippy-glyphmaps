//This code is based on http://gdreflections.com/2011/02/hexagonal-grid-math.html by Ruslan Shestopalyuk
export const _getHexDiscretiser = function (cellSize) {
    function getHexParams(cellSize) {
      const state = {
        NEIGHBORS_DI: [0, 1, 1, 0, -1, -1],
        NEIGHBORS_DJ: [
          [-1, -1, 0, 1, 0, -1],
          [-1, 0, 1, 1, 1, 0]
        ],
        NUM_NEIGHBORS: 6
      };
      state.RADIUS = Math.trunc((cellSize * 1.3) / 2);
      state.WIDTH = state.RADIUS * 2;
      state.HEIGHT = Math.trunc(state.RADIUS * Math.sqrt(3));
      state.SIDE = (state.RADIUS * 3) / 2;
      let cdx = [
        state.RADIUS / 2,
        state.SIDE,
        state.WIDTH,
        state.SIDE,
        state.RADIUS / 2,
        0
      ];
      state.CORNERS_DX = cdx;
      let cdy = [
        0,
        0,
        state.HEIGHT / 2,
        state.HEIGHT,
        state.HEIGHT,
        state.HEIGHT / 2
      ];
      state.CORNERS_DY = cdy;
      return state;
    }
    const hexParams = getHexParams(cellSize);
  
    let currentPadding;
    let hexParamsPadding;
  
    const discretiser = {
      getColRow: (x, y) => {
        let ci = Math.floor(x / hexParams.SIDE);
        let cx = x - hexParams.SIDE * ci;
  
        let ty = y - ((ci % 2) * hexParams.HEIGHT) / 2;
        let cj = Math.floor(ty / hexParams.HEIGHT);
        let cy = ty - hexParams.HEIGHT * cj;
  
        if (
          cx >
          Math.abs(
            hexParams.RADIUS / 2 - (hexParams.RADIUS * cy) / hexParams.HEIGHT
          )
        ) {
          return [ci, cj];
        } else {
          return [ci - 1, cj + (ci % 2) - (cy < hexParams.HEIGHT / 2 ? 1 : 0)];
        }
      },
  
      getXYCentre: (col, row) => {
        let xy = [
          col * hexParams.SIDE,
          (hexParams.HEIGHT * (2 * row + (col % 2))) / 2
        ];
        return [xy[0] + hexParams.RADIUS, xy[1] + hexParams.HEIGHT / 2];
      },
  
      getXYCentreCellUnits: (col, row) => {
        //as if cell side is 1
        const height = Math.sqrt(3);
        const side = 3 / 2;
  
        let xy = [col * side, (height * (2 * row + (col % 2))) / 2];
        return [xy[0] + 1, xy[1] + height / 2];
      },
  
      getBoundary: (col, row, padding) => {
        let coords = [];
  
        if (!padding) padding = 0;
        if (padding > 0 && padding != currentPadding) {
          currentPadding = padding;
          hexParamsPadding = getHexParams(cellSize - padding * 2);
        }
  
        const hexParamsForBoundary = padding ? hexParamsPadding : hexParams;
  
        let xy = [
          col * hexParams.SIDE,
          (hexParams.HEIGHT * (2 * row + (col % 2))) / 2
        ];
  
        for (let k = 0; k < hexParamsForBoundary.NUM_NEIGHBORS; k++)
          coords.push([
            Math.round(
              xy[0] + ((padding * 2) / 3) * 2 + hexParamsForBoundary.CORNERS_DX[k]
            ),
            Math.round(
              xy[1] + ((padding * 2) / 3) * 2 + hexParamsForBoundary.CORNERS_DY[k]
            )
          ]);
        return coords;
      },
      getCellSize: () => cellSize,
      type: "hex"
    };
    return discretiser;
  }