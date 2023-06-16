//based on https://observablehq.com/@d3/raster-tiles-canvas

const mapTypes = {
    OSMMapnik: function(x, y, z) {
        const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        return url;
    },
    CartoDBVoyager: function(x, y, z) {
        const url = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}${
            window.devicePixelRatio >= 2 ? "@2x" : ""
        }.png`;
        return url;
    },
    StamenTerrain: function(x, y, z) {
        const url = `https://stamen-tiles.a.ssl.fastly.net/terrain/${z}/${x}/${y}.png`;
        return url;
    },
    StamenTonerLite: function(x, y, z) {
        const url = `https://stamen-tiles-${"abc"[Math.abs(x + y) % 3]}.a.ssl.fastly.net/toner-lite/${z}/${x}/${y}${devicePixelRatio > 1 ? "@2x" : ""}.png`;
        return url;
    }
};

export { mapTypes };