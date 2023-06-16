import { mapTypes } from './maptypes.js';


export function _drawSlippyMap(options) {
  // console.log("Drawing slippy map...");

  const width = 1152;

  const mapType = options.mapType ? options.mapType : "OSMMapnik";
  const maxZoomLevel = 19;
  const tileWidth = options.tileWidth ? options.tileWidth : 256;
  const tileStore = options.tileStore ? options.tileStore : {};
  const ctx = options.ctx;
  const transform = options.transform ? options.transform : d3.zoomIdentity;
  const xMap = options.xMap ? options.xMap : d3.scaleLinear();
  const yMap = options.yMap ? options.yMap : d3.scaleLinear();
  const mercXToLon = options.mercXToLon;
  const mercYToLat = options.mercYToLat;
  const lonToMercX = options.lonToMercX;
  const latToMercY = options.latToMercY;
  const lonLatToScreen = options.coordToScreen;
  const screenToLonLat = options.screenToCoord;
  const greyscale = options.greyscale;

  // Returns the tile x from longitude// Modified from http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTileXFromLon(lon, zoom) {
  // console.log("lon zoom", lon, zoom, "getTileXFromLon")
  return clamp(
    Math.floor(((lon + 180.0) / 360.0) * Math.pow(2.0, zoom)),
    0,
    Math.pow(2, zoom) - 1
  );
}

  // function getTileXFromLon(lon, zoom) {
  //   return _.clamp(
  //     Math.floor(((lon + 180.0) / 360.0) * Math.pow(2.0, zoom)),
  //     0,
  //     Math.pow(2, zoom) - 1
  //   );
  // }

  //Returns the tile y from longitude
  //Modified from http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
  function getTileYFromLat(lat, zoom) {
    // console.log("getTileYFromLat", lat, zoom)
    return clamp(
      Math.floor(
        ((1.0 -
          Math.log(
            Math.tan((lat * Math.PI) / 180.0) +
            1.0 / Math.cos((lat * Math.PI) / 180.0)
          ) /
          Math.PI) /
          2.0) *
        Math.pow(2.0, zoom)
      ),
      0,
      Math.pow(2, zoom) - 1
    );
  }

  function getLonFromTileX(tileX, zoom) {
    return (tileX / Math.pow(2.0, zoom)) * 360.0 - 180.0;
  }

  function getLatFromTileY(tileY, zoom) {
    const n = Math.PI - (2.0 * Math.PI * tileY) / Math.pow(2.0, zoom);
    return (180.0 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  function getTileUrl(tileX, tileY, zoom, mapType, doubleResolution) {
    // console.log("getTileUrl", tileX, tileY, zoom, mapType, doubleResolution)
    let str = "";
    if (doubleResolution) str = "@2x";
    //return "asds";
    // console.log(mapTypes[mapType](tileX, tileY, zoom));
    return mapTypes[mapType](tileX, tileY, zoom);
  }

  const targetNumTileAcross = ctx.canvas.width / tileWidth;
  let numTilesAcross =
    getTileXFromLon(
      mercXToLon(xMap.invert((width - transform.x) / transform.k)),
      maxZoomLevel
    ) -
    getTileXFromLon(
      mercXToLon(xMap.invert((0 - transform.x) / transform.k)),
      maxZoomLevel
    );
  let targetZoom = maxZoomLevel;
  while (numTilesAcross > targetNumTileAcross) {
    numTilesAcross /= 2;
    targetZoom--;
  }

  let zoomLevel = targetZoom;
  const xTileLeft = getTileXFromLon(
    mercXToLon(xMap.invert((0 - transform.x) / transform.k)),
    zoomLevel
  );
  const xTileRight = getTileXFromLon(
    mercXToLon(xMap.invert((width - transform.x) / transform.k)),
    zoomLevel
  );
  const yTileTop = getTileYFromLat(
    mercYToLat(yMap.invert((0 - transform.y) / transform.k)),
    zoomLevel
  );
  const yTileBottom = getTileYFromLat(
    mercYToLat(yMap.invert((ctx.canvas.height - transform.y) / transform.k)),
    zoomLevel
  );

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (greyscale) ctx.filter = "grayscale(1)";

  // console.log("xTileLeft", xTileLeft, "xTileRight", xTileRight);

  // -- old code  
  // for (let x = xTileLeft; x <= xTileRight; x++) {
  //   for (let y = yTileTop; y <= yTileBottom; y++) {

  //     // console.log("here be dragons");
  //     const tileX = x;
  //     const tileY = y;
  //     const tileUrl = getTileUrl(tileX, tileY, zoomLevel, mapType, true);
  //     // console.log("url", tileUrl);
  //     let img;
  //     if (tileStore) img = tileStore[tileUrl];
  //     if (!img) {
  //       img = new Image();
  //       img.src = tileUrl;
  //       if (tileStore) tileStore[tileUrl] = img;
  //     }
  //     const lonTileX = getLonFromTileX(tileX, zoomLevel);
  //     const latTileY = getLatFromTileY(tileY, zoomLevel);
  //     const lonTileX2 = getLonFromTileX(tileX + 1, zoomLevel);
  //     const latTileY2 = getLatFromTileY(tileY + 1, zoomLevel);
  //     const tileScreenX = lonLatToScreen([lonTileX, 0])[0];
  //     const tileScreenX2 = lonLatToScreen([lonTileX2, 0])[0];
  //     const tileScreenY = lonLatToScreen([0, latTileY])[1];
  //     const tileScreenY2 = lonLatToScreen([0, latTileY2])[1];
  //     ctx.drawImage(
  //       img,
  //       tileScreenX,
  //       tileScreenY,
  //       tileScreenX2 - tileScreenX,
  //       tileScreenY2 - tileScreenY
  //     );
  //     // ctx.strokeRect(
  //     //   tileScreenX,
  //     //   tileScreenY,
  //     //   tileScreenX2 - tileScreenX,
  //     //   tileScreenY2 - tileScreenY
  //     // );
  //     // ctx.fillText(tileX + "," + tileY, tileScreenX, tileScreenY);
  //   }
  // }

  // -- new code
  // ...

  const tileCoords = [];
  const screenCoords = [];

  for (let x = xTileLeft; x <= xTileRight; x++) {
    for (let y = yTileTop; y <= yTileBottom; y++) {
      const tileX = x;
      const tileY = y;
      const tileUrl = getTileUrl(tileX, tileY, zoomLevel, mapType, true);
      let img;
      if (tileStore) img = tileStore[tileUrl];
      if (!img) {
        img = new Image();
        img.src = tileUrl;
        if (tileStore) tileStore[tileUrl] = img;
      }

      // Check if tile coordinates are already cached
      let tileIndex = tileCoords.findIndex(
        (coord) => coord.tileX === tileX && coord.tileY === tileY
      );
      if (tileIndex === -1) {
        // Compute tile coordinates and cache them
        const lonTileX = getLonFromTileX(tileX, zoomLevel);
        const latTileY = getLatFromTileY(tileY, zoomLevel);
        const lonTileX2 = getLonFromTileX(tileX + 1, zoomLevel);
        const latTileY2 = getLatFromTileY(tileY + 1, zoomLevel);
        const tileScreenX = lonLatToScreen([lonTileX, 0])[0];
        const tileScreenX2 = lonLatToScreen([lonTileX2, 0])[0];
        const tileScreenY = lonLatToScreen([0, latTileY])[1];
        const tileScreenY2 = lonLatToScreen([0, latTileY2])[1];
        tileCoords.push({ tileX, tileY });
        screenCoords.push({
          tileScreenX,
          tileScreenX2,
          tileScreenY,
          tileScreenY2,
        });
        tileIndex = tileCoords.length - 1;
      }

      // Use cached screen coordinates
      const { tileScreenX, tileScreenX2, tileScreenY, tileScreenY2 } =
        screenCoords[tileIndex];
      ctx.drawImage(
        img,
        tileScreenX,
        tileScreenY,
        tileScreenX2 - tileScreenX,
        tileScreenY2 - tileScreenY
      );
    }
  };

  // ...



  if (greyscale) ctx.filter = "none";

  // ctx.fillText(d3Proj([0, 0])[0], 300, 200);
  //ctx.fillText(latLonToScreen(0, 0)[0], 200, 200);
  // console.log("done.");
}


