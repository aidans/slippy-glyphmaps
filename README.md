# Gridded Glyphmaps for Leaflet

A lightweight, canvas-based Leaflet plugin for creating gridded glyph maps to visualize dense point data.

This library aggregates point data into a grid (square or hexagonal) and allows for flexible, data-driven rendering of glyphs within each cell. It's designed for performance with large datasets by leveraging canvas rendering and efficient data aggregation.

![Example Screenshot](https://i.imgur.com/wg6PEwz.png)

---

## Features

-   **Leaflet Integration:** Works as a standard Leaflet layer.
-   **Gridding:** Aggregates data into square or hexagonal cells.
-   **Custom Rendering:** Use simple options for common cases (e.g., heatmaps) or provide your own drawing functions for highly customized glyphs.
-   **Performant:** Uses HTML5 Canvas for rendering, suitable for large numbers of points.

---

## Installation

First, ensure you have Leaflet in your project. Then, install the gridded-glyphmaps library via npm:

```bash
npm install gridded-glyphmaps leaflet
```

---

## How to Use

Gridded-glyphmaps works as a Leaflet layer. You initialize it and add it to your map just like any other layer.

### 1. Include Libraries

Make sure to include Leaflet's CSS and JS, along with the gridded-glyphmaps library.

```html
<!-- index.html -->
<head>
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- Your app's CSS -->
    <link rel="stylesheet" href="style.css">

    <!-- Gridded-glyphmaps library (after leaflet) -->
    <script src="node_modules/gridded-glyphmaps/dist/gridded-glyphmaps.leaflet.min.js"></script>

    <!-- Your app's main script -->
    <script src="main.js" type="module"></script>
</head>
<body>
    <div id="map"></div>
</body>
```

### 2. Create the Map

In your `main.js`, create a Leaflet map and add the glyph layer.

```javascript
// main.js

// 1. Create a standard Leaflet map
const map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// 2. Your data
const myData = [
    { lat: 51.505, lon: -0.09, value: 10 },
    { lat: 51.51, lon: -0.1, value: 20 },
    // ... more data points
];

// 3. Create and add the glyph layer
const glyphLayer = L.griddedGlyph({
  data: myData,
  getLocationFn: (row) => [row.lon, row.lat], // Extract [lon, lat] from data
  cellSize: 50, // Size of grid cells in pixels
  discretisationShape: "hex", // or "grid"

  // Use a pre-configured heatmap glyph
  type: 'mean',
  colourFieldFn: (row) => row.value,
  
}).addTo(map);

```

---

## Key Options

-   `data` (Array): Your array of data points.
-   `getLocationFn` (Function): A function that takes a data row and returns its coordinates as `[longitude, latitude]`.
-   `cellSize` (Number): The size of each grid cell in pixels.
-   `discretisationShape` (String): The shape of the cells. Can be `'grid'` (squares) or `'hex'` (hexagons).
-   `type` (String): For simple glyphs, specifies the aggregation type. Can be `'mean'`, `'sum'`, or `'count'`.
-   `colourFieldFn` (Function): Used with `type: 'mean'` or `type: 'sum'`, this function specifies which property of your data row to aggregate.
-   `glyph` (Object): For fully custom rendering, provide an object with your own aggregation and drawing functions (`aggrFn`, `drawFn`, etc.). See the files in the `examples` directory for a detailed implementation.

## Building from Source

If you want to contribute or build the library yourself:

* `git clone` this repository
* `npm install`
* `npm run build`

The resulting library will be available in `dist/gridded-glyphmaps.leaflet.min.js`.
