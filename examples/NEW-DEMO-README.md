# Urban Parameters Demo - Gridded Glyphmap

This demo showcases the updated gridded glyphmap library integrated with Leaflet.js, visualizing urban accessibility parameters from Scottish data zones.

## Files

- **`new-demo.html`** - The main HTML page with Leaflet integration
- **`new-demo-script.js`** - The JavaScript implementation adapted from the original monolithic demo
- **`data/urban_parameters.csv`** - Urban accessibility data (6000+ records)

## Features

### Data Visualization
- **Grid-based aggregation**: Point data is aggregated into grid cells
- **Multi-variable glyphs**: Each cell displays 6 accessibility metrics as colored squares:
  - 🟢 Supermarket accessibility
  - 🟠 Hospital accessibility  
  - 🟢 GP accessibility
  - 🔵 School accessibility
  - 🔵 Employment accessibility
  - 🟣 Urban centre accessibility

### Interactions
- **Pan and zoom**: Standard Leaflet map controls
- **Tooltips**: Hover over cells to see detailed accessibility percentages
- **Responsive legend**: Shows variable meanings with color coding

## Key Changes from Original Demo

1. **Leaflet Integration**: Replaced custom D3 slippy map with Leaflet.js
2. **CSV Data Loading**: Uses D3's CSV parser instead of JSON
3. **Modular Structure**: Separated concerns between map management and glyph rendering
4. **Updated API**: Uses `GriddedGlyphLayer` class following Leaflet plugin patterns

## Technical Implementation

### Data Processing
```javascript
// Aggregation: Collect all records per grid cell
function appendRecordsAggrFn(cell, row, weight, global, panel) {
    if (!cell.records) cell.records = [];
    cell.records.push(row);
}

// Post-aggregation: Calculate averages and maxima
function summariseVariablesPostAggr(listOfVariables) {
    return function postAggrFn(cells, cellSize, global, panel) {
        // Calculate averages for each cell and global maxima
    };
}
```

### Rendering
```javascript
// Custom drawing function for 2x3 grid of squares
function drawFnSquares(cell, x, y, cellSize, ctx, global, panel) {
    // Renders colored squares based on accessibility values
}
```

### Usage
```javascript
const glyphLayer = new GriddedGlyphLayer({
    data: csvData,
    getLocationFn: (row) => [row.long, row.lat],
    cellSize: 30,
    discretisationShape: "grid",
    glyph: {
        aggrFn: appendRecordsAggrFn,
        postAggrFn: summariseVariablesPostAggr(selected_variables),
        drawFn: drawFnSquares,
        postDrawFn: drawLegend,
        tooltipTextFn: tooltipTextFn
    }
}).addTo(map);
```

## Running the Demo

1. Ensure the gridded-glyphmaps library is built (`npm run build`)
2. Serve the examples directory with a local server
3. Open `new-demo.html` in your browser
4. The map should center on Scottish data and display the gridded glyphmaps

## Data Source

The urban parameters dataset contains accessibility metrics for Scottish data zones, measuring proximity to various urban services as percentages.
