//This code is based on http://gdreflections.com/2011/02/hexagonal-grid-math.html by Ruslan Shestopalyuk
interface HexParams {
  NEIGHBORS_DI: number[];
  NEIGHBORS_DJ: number[][];
  NUM_NEIGHBORS: number;
  RADIUS: number;
  WIDTH: number;
  HEIGHT: number;
  SIDE: number;
  CORNERS_DX: number[];
  CORNERS_DY: number[];
}

export const _getHexDiscretiser = function (cellSize: number) {
  function getHexParams(cellSize: number): HexParams {
    const state: HexParams = {
      NEIGHBORS_DI: [0, 1, 1, 0, -1, -1],
      NEIGHBORS_DJ: [
        [-1, -1, 0, 1, 0, -1],
        [-1, 0, 1, 1, 1, 0],
      ],
      NUM_NEIGHBORS: 6,
      RADIUS: 0,
      WIDTH: 0,
      HEIGHT: 0,
      SIDE: 0,
      CORNERS_DX: [],
      CORNERS_DY: [],
    };
    state.RADIUS = Math.trunc((cellSize * 1.3) / 2);
    const hexParams: HexParams = getHexParams(cellSize);
    state.WIDTH = hexParams.WIDTH;
    state.HEIGHT = hexParams.HEIGHT;
    state.SIDE = hexParams.SIDE;
    state.CORNERS_DX = hexParams.CORNERS_DX;
    state.CORNERS_DY = hexParams.CORNERS_DY;
    state.WIDTH = state.RADIUS * 2;
    state.HEIGHT = Math.trunc(state.RADIUS * Math.sqrt(3));
    state.SIDE = (state.RADIUS * 3) / 2;
    // const cdx = [
    //   state.RADIUS / 2,
    //   state.SIDE,
    //   state.WIDTH,
    //   state.SIDE,
    //   state.RADIUS / 2,
    //   0,
    // ];
    // state.CORNERS_DX = cdx;
    // const cdy = [
    //   0,
    //   0,
    //   state.HEIGHT / 2,
    //   state.HEIGHT,
    //   state.HEIGHT,
    //   state.HEIGHT / 2,
    // ];

    let cdx = [
      state.RADIUS / 2,
      state.SIDE,
      state.WIDTH,
      state.SIDE,
      state.RADIUS / 2,
      0,
    ];
    state.CORNERS_DX = cdx;
    let cdy = [
      0,
      0,
      state.HEIGHT / 2,
      state.HEIGHT,
      state.HEIGHT,
      state.HEIGHT / 2,
    ];
    state.CORNERS_DY = cdy;
    state.CORNERS_DY = cdy;
    return state;
  }
  const hexParams: HexParams = getHexParams(cellSize);

  let currentPadding: number;
  let hexParamsPadding: HexParams;

  const discretiser = {
    getColRow: (x: number, y: number): [number, number] => {
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

    getXYCentre: (col: number, row: number): [number, number] => {
      let xy = [
        col * hexParams.SIDE,
        (hexParams.HEIGHT * (2 * row + (col % 2))) / 2,
      ];
      return [xy[0] + hexParams.RADIUS, xy[1] + hexParams.HEIGHT / 2];
    },

    getXYCentreCellUnits: (col: number, row: number): [number, number] => {
      //as if cell side is 1
      const height = Math.sqrt(3);
      const side = 3 / 2;

      let xy = [col * side, (height * (2 * row + (col % 2))) / 2];
      return [xy[0] + 1, xy[1] + height / 2];
    },

    getBoundary: (
      col: number,
      row: number,
      padding?: number
    ): [number, number][] => {
      let coords: [number, number][] = [];

      if (!padding) padding = 0;
      if (padding > 0 && padding != currentPadding) {
        currentPadding = padding;
        hexParamsPadding = getHexParams(cellSize - padding * 2);
      }

      const hexParamsForBoundary = padding ? hexParamsPadding : hexParams;

      let xy = [
        col * hexParams.SIDE,
        (hexParams.HEIGHT * (2 * row + (col % 2))) / 2,
      ];

      for (let k = 0; k < hexParamsForBoundary.NUM_NEIGHBORS; k++)
        coords.push([
          Math.round(
            xy[0] + ((padding * 2) / 3) * 2 + hexParamsForBoundary.CORNERS_DX[k]
          ),
          Math.round(
            xy[1] + ((padding * 2) / 3) * 2 + hexParamsForBoundary.CORNERS_DY[k]
          ),
        ]);
      return coords;
    },
    getCellSize: (): number => cellSize,
    type: "hex",
  };
  return discretiser;
};
