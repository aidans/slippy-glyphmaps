import { _drawSlippyMap } from "./drawslippymap.js";
import * as d3 from "d3";
// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
// import { throttle } from "lodash";

// import * as d3 from "d3";
// import _ from 'lodash';
// var _ = require('lodash');

// const div = d3.selectAll("div");

export function slippyMap(options) {
  const useMercator =
    options.coordType && options.coordType != "mercator" ? false : true; //mercator||xy

  // console.log("Using Mercator=", useMercator);
  const width = options.width;
  const height = options.height;
  const tileWidth = options.tileWidth ? options.tileWidth : 256;
  const maxZoom = 19;
  let initFn;
  if (options.initFn) initFn = [options.initFn];
  let drawFn;
  if (options.drawFn) drawFn = [options.drawFn];
  const initialBB = options.initialBB;
  const greyscale = options.greyscale;
  const mapType = options.mapType;
  let onPan;
  let onZoom;
  const interactiveZoomPan =
    options.interactiveZoomPan !== undefined
      ? options.interactiveZoomPan
      : true;

  const container = d3.create("div");
  container.style.width = width;
  const canvas = d3.select(container).node().append("canvas").node();
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  canvas.width = width; // * window.devicePixelRatio;
  canvas.height = height; // * window.devicePixelRatio;
  const zoom = d3.zoom().scaleExtent([0, 50000]);
  const tileStore = {};

  let coordExtent;
  if (useMercator) {
    //FOR MERCATOR, ALWAYS USE WHOLE EARTH
    //zoom to initialBB iF specified
    coordExtent = [
      lonToMercX(-180),
      latToMercY(90),
      lonToMercX(180),
      latToMercY(-90),
    ];
  } else if (!useMercator && options.initialBB) {
    const xScale = Math.abs(
      (options.initialBB[0] - options.initialBB[2]) / width
    );
    const yScale = Math.abs(
      (options.initialBB[1] - options.initialBB[3]) / height
    );
    if (xScale < yScale)
      coordExtent = [
        options.initialBB[0],
        options.initialBB[1],
        options.initialBB[0] + width * yScale,
        options.initialBB[3],
      ];
    else
      coordExtent = [
        options.initialBB[0],
        options.initialBB[3] - height * xScale,
        options.initialBB[2],
        options.initialBB[3],
      ];
    // console.log("coordExtent", coordExtent);
  } else coordExtent = [0, 0, width, height];

  //console.log(coordExtent);

  //helper functions
  function latToMercY(lat) {
    if (lat < -85) {
      lat = -85;
    } else if (lat > 85) {
      lat = 85;
    }
    return Math.log(
      Math.tan(degreesToRadians(lat)) + 1 / Math.cos(degreesToRadians(lat))
    );
  }

  function lonToMercX(lon) {
    if (lon < -180) {
      lon = -180;
    } else if (lon > 180) {
      lon = 180;
    }
    return degreesToRadians(lon);
  }

  function mercYToLat(y) {
    return radiansToDegrees(Math.atan(Math.sinh(y)));
  }
  function mercXToLon(x) {
    return radiansToDegrees(x);
  }

  function radiansToDegrees(radians) {
    return (radians * 180) / Math.PI;
  }

  function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  const xMap = d3
    .scaleLinear()
    .domain([coordExtent[0], coordExtent[2]])
    .range([0, canvas.width]);

  const yMap = d3
    .scaleLinear()
    .domain([coordExtent[1], coordExtent[3]])
    .range(useMercator ? [0, canvas.width] : [canvas.height, 0]); //so it's square

  const coordToScreen = useMercator
    ? ([x, y]) => {
        const transform = d3.zoomTransform(d3Canvas.node());
        return [
          xMap(lonToMercX(x)) * transform.k + transform.x,
          yMap(latToMercY(y)) * transform.k + transform.y,
        ];
      }
    : ([x, y]) => {
        const transform = d3.zoomTransform(d3Canvas.node());
        return [
          xMap(x) * transform.k + transform.x,
          yMap(y) * transform.k + transform.y,
        ];
      };

  const screenToCoord = useMercator
    ? ([x, y]) => {
        const transform = d3.zoomTransform(d3Canvas.node());
        return [
          mercXToLon(xMap.invert((x - transform.x) / transform.k)),
          mercYToLat(yMap.invert((y - transform.y) / transform.k)),
        ];
      }
    : ([x, y]) => {
        const transform = d3.zoomTransform(d3Canvas.node());
        return [
          xMap.invert((x - transform.x) / transform.k),
          yMap.invert((y - transform.y) / transform.k),
        ];
      };

  function zoomTo(bb, duration) {
    {
      const bbMinX = useMercator ? lonToMercX(bb[0]) : bb[0];
      const bbMaxY = Math.max(
        useMercator ? latToMercY(bb[1]) : bb[1],
        useMercator ? latToMercY(bb[3]) : bb[3]
      );
      const bbMaxX = useMercator ? lonToMercX(bb[2]) : bb[2];
      const bbMinY = Math.min(
        useMercator ? latToMercY(bb[1]) : bb[1],
        useMercator ? latToMercY(bb[3]) : bb[3]
      );
      const minX = xMap.invert(0);
      const minY = Math.min(yMap.invert(0), yMap.invert(canvas.height));
      const maxX = xMap.invert(canvas.width);
      const maxY = Math.max(yMap.invert(0), yMap.invert(canvas.height));
      const xScale = (maxX - minX) / (bbMaxX - bbMinX);
      const yScale = (maxY - minY) / (bbMaxY - bbMinY);

      let selection;
      if (!duration) selection = d3Canvas;
      else selection = d3Canvas.transition().duration(duration);

      selection.call(
        zoom.transform,
        d3.zoomIdentity
          .translate(
            xMap(bbMinX + (bbMaxX - bbMinX) / 2),
            yMap(bbMinY + (bbMaxY - bbMinY) / 2)
          )
          .scale(Math.min(xScale, yScale))
          .translate(
            -xMap(bbMinX + (bbMaxX - bbMinX) / 2),
            -yMap(bbMinY + (bbMaxY - bbMinY) / 2)
          )
      );
    }
  }

  function throttle(fn, delay) {
    let lastCallTime = 0;
    let timeoutId;
    const throttledFn = function (...args) {
      const now = new Date().getTime();
      if (now - lastCallTime >= delay) {
        lastCallTime = now;
        fn.apply(this, args);
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastCallTime = now;
          fn.apply(this, args);
        }, delay - (now - lastCallTime));
      }
    };
    throttledFn.cancel = function () {
      clearTimeout(timeoutId);
    };
    return throttledFn;
  }

  const throttleDraw = throttle(function (e) {
    if (useMercator && mapType != "none") {
      _drawSlippyMap({
        tileStore,
        ctx,
        transform: d3.zoomTransform(d3Canvas.node()),
        xMap,
        yMap,
        mercYToLat,
        mercXToLon,
        lonToMercX,
        latToMercY,
        coordToScreen,
        screenToCoord,
        tileWidth,
        greyscale,
        mapType,
      });
    } else ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (drawFn) {
      for (const fn of drawFn) {
        fn(container.node(), e);
      }
    }
  }, 100);

  //draw map
  // const throttleDraw = _.throttle(
  //   (e) => {
  //     if (useMercator && mapType != "none") {
  //       _drawSlippyMap({
  //         tileStore,
  //         ctx,
  //         transform: d3.zoomTransform(d3Canvas.node()),
  //         xMap,
  //         yMap,
  //         mercYToLat,
  //         mercXToLon,
  //         lonToMercX,
  //         latToMercY,
  //         coordToScreen,
  //         screenToCoord,
  //         tileWidth,
  //         greyscale,
  //         mapType
  //       });
  //     } else ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  //     if (drawFn) {
  //       for (const fn of drawFn) {
  //         fn(container.node(), e);
  //       }
  //     }
  //   },
  //   100,
  //   { leading: true }
  // );

  //register the canvas with the zoom (canvas instead of div because div is width of browserr)
  const d3Canvas = d3.select(ctx.canvas);
  d3Canvas.call(zoom);
  //run the draw function when zooming takes place
  zoom.on("zoom", (e) => {
    if (onPan && e?.sourceEvent?.type == "mousemove") onPan(e?.sourceEvent);
    if (onZoom && e?.sourceEvent?.type != "mousemove") onZoom(e?.sourceEvent);
    throttleDraw.cancel();
    throttleDraw(e);
  });
  d3Canvas.call(zoom).on("dblclick.zoom", null);

  //disable zooming
  if (!interactiveZoomPan) {
    d3Canvas.call(zoom).on(".zoom", null);
  }

  //add listeners
  container.node().addEventListener("mousemove", (e) => {
    throttleDraw(e);
    // ctx.fillText(d3Proj([0, 0]), 100, 100);
  });
  container.node().tabIndex = "0"; //makes it keyboard focussable
  container.node().addEventListener("keydown", (event) => {
    event.preventDefault();
    if (event.key == "r") {
      zoomTo(initialBB, 1000);
    }
  });

  //"Public" methods
  container.node().resetZoom = () => {
    d3Canvas.transition().duration(2000).call(zoom.transform, d3.zoomIdentity);
    return true;
  };
  container.node().screenToCoord = (xy) => screenToCoord(xy);
  container.node().coordToScreen = (lonLat) => coordToScreen(lonLat);
  container.node().zoomTo = (bb) => zoomTo(bb);
  container.node().ctx = ctx;
  container.node().addInitFn = (initFunction) => {
    //has to be set after
    if (!drawFn) initFn = [initFunction];
    else initFn.push(initFunction);
  };
  container.node().addDrawFn = (drawFunction) => {
    if (!drawFn) drawFn = [drawFunction];
    else drawFn.push(drawFunction);
  };
  container.node().getTransform = () => d3.zoomTransform(d3Canvas.node());
  container.node().redraw = () => throttleDraw();
  container.node().setOnZoomFn = (onZoomFn) => {
    onZoom = onZoomFn;
  }; //has to be set after
  container.node().setOnPanFn = (onPanFn) => (onPan = onPanFn); //has to be set after
  container.node().getWidth = () => width;
  container.node().getHeight = () => height;
  container.node().getCoordExtent = () => coordExtent;
  if (initFn) {
    for (const fn of initFn) {
      fn(container.node());
    }
  }

  if (useMercator && initialBB) {
    zoomTo(initialBB);
  }
  throttleDraw();
  return container.node();
}
