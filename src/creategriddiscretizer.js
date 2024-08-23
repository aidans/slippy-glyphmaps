import { _getGridDiscretiser } from "./griddiscretizer.js";

export const createDiscretiserValue = function(params) {
    const valueFn = params && params.valueFn ? params.valueFn : undefined;
    const glyphLocationFn =
      params && params.glyphLocationFn ? params.glyphLocationFn : undefined;
    const boundaryFn =
      params && params.boundaryFn ? params.boundaryFn : undefined;

    return function (options) {
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
      const panel = options.panel;
      const discretiser = _getGridDiscretiser(cellSize);

      const global = options.global;
      let spatialUnitsLookup = {};
      const topLeftCoord = screenToCoordFn([0, height]);
      const bottomRightCoord = screenToCoordFn([width, 0]);

      if (preAggrFn) {
        preAggrFn([], cellSize, global, panel); //empty array because spatialUnitsLookup is always empty - probably eventually remove from this function
      }
      let i = 0;
      for (let datum of data) {
        let key;
        if (valueFn) key = valueFn(datum);
        else {
          key = i;
          i++;
        }
        const location = glyphLocationFn
          ? glyphLocationFn(key) ?? [0, 0]
          : getLocationFn(datum);
        const screenXY = coordToScreenFn(location);
        if (
          location[0] >= topLeftCoord[0] &&
          location[0] <= bottomRightCoord[0] &&
          location[1] >= topLeftCoord[1] &&
          location[1] <= bottomRightCoord[1]
        ) {
          let spatialUnit = spatialUnitsLookup[key];
          if (!spatialUnit) {
            let screenBoundary;
            if (boundaryFn)
              screenBoundary = boundaryFn(key)?.map((coord) =>
                coordToScreenFn([coord[0], coord[1]])
              );

            spatialUnit = {
              getBoundary: screenBoundary
                ? () => screenBoundary
                : (padding) =>
                    discretiser.getBoundaryScreenCoord(
                      screenXY[0],
                      screenXY[1],
                      padding
                    ),
              getXCentre: () => Math.trunc(screenXY[0]),
              getYCentre: () => Math.trunc(screenXY[1]),
              getCellSize: () => cellSize
            };
            spatialUnitsLookup[key] = spatialUnit;
          }

          if (aggrFn)
            if (!Array.isArray(aggrFn))
              aggrFn(spatialUnit, datum, 1, global, panel);
            else
              for (const aggrFn1 of aggrFn)
                if (aggrFn1) aggrFn1(spatialUnit, datum, 1, global, panel);
        }
      }
      const spatialUnits = Object.values(spatialUnitsLookup);
      spatialUnits.yOffset = 0;
      spatialUnits.xOffset = 0;

      if (postAggrFn) {
        postAggrFn(spatialUnits, cellSize, global, panel);
      }

      return spatialUnits;
    };
  }