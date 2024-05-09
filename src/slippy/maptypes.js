//based on https://observablehq.com/@d3/raster-tiles-canvas

const mapTypes = {
  OSMMapnik: function (x, y, z) {
    const url = `https://${
      "abc"[Math.abs(x + y) % 3]
    }.tile.osm.org/${z}/${x}/${y}.png`;
    return url;
  },
  CartoDBVoyager: function (x, y, z) {
    const url = `https://${
      "abc"[Math.abs(x + y) % 3]
    }.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  CartoDBVoyagerNoLabel: function (x, y, z) {
    const url = `https://${
      "abc"[Math.abs(x + y) % 3]
    }.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  CartoDark: function (x, y, z) {
    const url = `https://${
      "abc"[Math.abs(x + y) % 3]
    }.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  CartoPositronNoLabel: function (x, y, z) {
    const url = `https://${
      "abc"[Math.abs(x + y) % 3]
    }.basemaps.cartocdn.com/dark_nolabels/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  CartoPositron: function (x, y, z) {
    const url = `https://${
      "abc"[Math.abs(x + y) % 3]
    }.basemaps.cartocdn.com/light_all/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  CartoPositronNoLabel: function (x, y, z) {
    const url = `https://${
      "abc"[Math.abs(x + y) % 3]
    }.basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaStamenToner: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/stamen_toner/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaStamenTonerLite: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/stamen_toner_lite/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaStamenWatercolor: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/stamen_watercolor/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaStamenOutdoor: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/outdoors/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaStamenTerrain: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/stamen_terrain/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaAlidade: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/alidade_smooth/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaAlidadeDark: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StadiaOSMBright: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/osm_bright/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StamenTerrain: function (x, y, z) {
    const url = `https://stamen-tiles-${
      "abc"[Math.abs(x + y) % 3]
    }.a.ssl.fastly.net/terrain/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StamenToner: function (x, y, z) {
    const url = `https://stamen-tiles-${
      "abc"[Math.abs(x + y) % 3]
    }.a.ssl.fastly.net/toner/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StamenTonerHybrid: function (x, y, z) {
    const url = `https://stamen-tiles-${
      "abc"[Math.abs(x + y) % 3]
    }.a.ssl.fastly.net/toner-hybrid/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png`;
    return url;
  },
  StamenTonerLite: function (x, y, z) {
    const url = `https://tiles.stadiamaps.com/tiles/stamen_toner_lite/${z}/${x}/${y}${
      devicePixelRatio > 1 ? "@2x" : ""
    }.png?api_key=72123526-80f2-47a1-9d0c-a4a0aeb78b42`;
    return url;
  },
  StamenWatercolor: function (x, y, z) {
    const url = `https://stamen-tiles-${
      "abc"[Math.abs(x + y) % 3]
    }.a.ssl.fastly.net/watercolor/${z}/${x}/${y}.png`;
    return url;
  },
  OSMStandard: function (x, y, z) {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    return url;
  },
  WikimediaMaps: function (x, y, z) {
    const url = `https://maps.wikimedia.org/osm-intl/${z}/${x}/${y}.png`;
    return url;
  },
  // OSMMapnik: function(x, y, z) {
  //     const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  //     return url;
  // },
  // CartoDBVoyager: function(x, y, z) {
  //     const url = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}${
  //         window.devicePixelRatio >= 2 ? "@2x" : ""
  //     }.png`;
  //     return url;
  // },
  // StamenTerrain: function(x, y, z) {
  //     const url = `https://stamen-tiles.a.ssl.fastly.net/terrain/${z}/${x}/${y}.png`;
  //     return url;
  // },
  // StamenTonerLite: function(x, y, z) {
  //     const url = `https://stamen-tiles-${"abc"[Math.abs(x + y) % 3]}.a.ssl.fastly.net/toner-lite/${z}/${x}/${y}${devicePixelRatio > 1 ? "@2x" : ""}.png`;
  //     return url;
  // }
};

export { mapTypes };
