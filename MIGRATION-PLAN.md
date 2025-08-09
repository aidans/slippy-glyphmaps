# Migration Plan: Custom Slippy Map to Leaflet.js

This document outlines the strategy and steps required to refactor the `gridded-glyphmaps` library, replacing the custom D3-based slippy map implementation with [Leaflet.js](https://leafletjs.com/).

**Primary Goal:** Decouple the glyph-gridding and rendering logic from the basemap implementation. By using Leaflet.js, we can leverage a robust, well-maintained, and feature-rich mapping library, reducing custom code and improving user experience.

**Guiding Principle:** Minimize changes to the public-facing `glyphMap` API to ensure a smooth transition for existing users. The core data processing and visualization logic will be preserved.

---

## 1. Code Evaluation Summary

-   **Current Architecture:** The library is built around a monolithic `glyphMap` function in `src/index.js`. This function initializes a custom D3-based slippy map from `src/slippy/slippymaps.js`, which handles panning, zooming, and tile loading. The core gridding and rendering logic (e.g., `heatmap2d.js`, `hexdiscretizer.js`) is then executed within a `drawFn` callback provided to the slippy map.
-   **Public API (`examples/main.js`):** The library is instantiated via a single function call:
    ```javascript
    const container = glyphMap({
        data: data,
        getLocationFn: (row) => [row.lon, row.lat],
        cellSize: 35,
        // ... other options
    });
    document.body.appendChild(container);
    ```
-   **Core Logic to Preserve:**
    -   Gridding algorithms: `creategriddiscretizer.js`, `griddiscretizer.js`, `hexdiscretizer.js`.
    -   Data aggregation and processing: `heatmap2d.js`, `kernelsmooth.js`.
    -   Custom drawing and styling logic passed in the `glyph` or `customMap` options.
-   **Code to be Replaced:**
    -   The entire `src/slippy/` directory, including `slippymaps.js`, `drawslippymap.js`, and `utils/tile-loader.js`.

---

## 2. Proposed Migration Steps

### Step 1: Setup Environment & Dependencies

1.  **Add Leaflet:** Add Leaflet as a project dependency. Since it will be a peer dependency for the final library, it should be added accordingly.
    ```bash
    npm install leaflet
    ```
2.  **Update Build Process:** Adjust `rollup.config.js` to handle Leaflet. It should be treated as an external dependency/peer dependency so it's not bundled with the library source.

### Step 2: Integrate a Leaflet Canvas Layer

1.  **Create Leaflet Layer File:** Copy the user-provided `l.canvaslayer.js` into the project under `src/leaflet/L.CanvasLayer.js`. This will serve as the foundation for our new rendering layer.
2.  **Create the Glyph Layer:** Create a new file `src/leaflet/L.GriddedGlyph.js`. This file will contain a new class that extends `L.CanvasLayer`. This class will be the main bridge between Leaflet and the existing glyphmap rendering engine.

### Step 3: Bridge Leaflet with Rendering Logic

1.  **Implement `L.GriddedGlyph.js`:**
    -   The constructor will accept the `glyphMap` options.
    -   It will implement the `onDrawLayer` method required by `L.CanvasLayer`.
    -   Inside `onDrawLayer`, it will receive map context from Leaflet (bounds, zoom, size, canvas).
    -   This method will be responsible for calling the existing `_generate2DHeatMap` (`discretiserFn`) and subsequent drawing functions, similar to how the `drawFn` in `src/index.js` currently works.
    -   It will need to create `coordToScreen` and `screenToCoord` functions that wrap Leaflet's `map.latLngToContainerPoint()` and `map.containerPointToLatLng()` methods to pass to the gridding engine.

### Step 4: Refactor the Public API (`index.js`)

1.  **Create a Leaflet-style Initializer:** Instead of the `glyphMap` function returning a DOM element, we will adopt the standard Leaflet plugin pattern.
2.  **New API Structure:**
    ```javascript
    // In src/index.js or a new entry point
    import { GriddedGlyphLayer } from './leaflet/L.GriddedGlyph.js';

    // Leaflet convention
    L.griddedGlyph = function(options) {
      return new GriddedGlyphLayer(options);
    };
    ```
3.  **Deprecate `glyphMap`:** The old `glyphMap` function will be removed. The new entry point will be the `L.griddedGlyph` factory.

### Step 5: Update Examples and Usage

1.  **Modify `examples/index.html`:** Add the Leaflet CSS and JS includes. Create a `div` for the map, e.g., `<div id="map"></div>`.
2.  **Modify `examples/main.js`:**
    -   Initialize a standard Leaflet map.
    -   Add a tile layer (e.g., from CartoDB or OpenStreetMap).
    -   Instantiate the glyphmap using the new API and add it to the map.

### Step 6: Cleanup and Documentation

1.  **Remove Old Code:** Once the Leaflet implementation is stable and the example works, delete the entire `src/slippy/` directory.
2.  **Update `README.md`:** Thoroughly document the new, Leaflet-based API, including installation, usage examples, and options.
3.  **Review `package.json`:** Ensure `leaflet` is listed as a `peerDependency`.

---

## 3. Potential Improvements During Refactoring

-   **TypeScript Conversion:** The project already contains some `.ts` files. This is a perfect opportunity to convert the core logic (`L.GriddedGlyph.js`, `heatmap2d.js`, `index.js`) to TypeScript for improved type safety and maintainability.
-   **Modularity:** Further break down the monolithic `index.js` options processing into smaller, more manageable modules.
-   **API Refinement:** While aiming for stability, we can introduce cleaner option structures. For example, consolidating all rendering and data-related options under a single `glyph` object, and map-related options under a `map` object.
-   **Testing:** Introduce a testing framework like Vitest or Jest to create unit tests for the gridding and aggregation logic, which is currently untested.

---

## 4. API Changes Summary (Before vs. After)

This illustrates the primary change from a user's perspective.

### Before:

```javascript
// examples/main.js
import { glyphMap } from "../dist/index.min.js";

const container = glyphMap({
  data: data,
  width: 600,
  height: 400,
  // ... other options
});

document.getElementById('map-container').appendChild(container);
```

### After:

```javascript
// examples/main.js
// Assumes Leaflet is loaded via <script> or import
import "../dist/gridded-glyphmaps.leaflet.min.js";

// 1. Create a standard Leaflet map
const map = L.map('map').setView([lat, lon], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
	attribution: '...'
}).addTo(map);

// 2. Create and add the glyph layer
const glyphLayer = L.griddedGlyph({
  data: data,
  // ... other options (width/height are now controlled by Leaflet)
}).addTo(map);
```
