console.log("=== STARTING TILED DEMO SCRIPT ===");

import * as d3 from "d3";
import * as L from "leaflet";
import { TiledGriddedGlyphLayer } from "../dist/gridded-glyphmaps.leaflet.min.js";

console.log("=== IMPORTS LOADED SUCCESSFULLY ===");
console.log("D3 version:", d3.version);
console.log("Leaflet version:", L.version);
console.log("TiledGriddedGlyphLayer:", typeof TiledGriddedGlyphLayer);

// Configuration from original demo-script.js
const csvDataPath = "./data/urban_parameters.csv";
const colours = [
    "#2e8b57ba", // Supermarket
    "#ffa500ba", // Hospitals  
    "#00ff00ba", // GP
    "#0000ffba", // School
    "#1e90ffba", // Employment
    "#ff1493ba"  // Urban Centre
];

const selected_variables = [
    "acc_supermarket", 
    "acc_hospitals", 
    "acc_gp", 
    "acc_school", 
    "acc_employment", 
    "acc_urbancentre"
];

// Create a standard Leaflet map
console.log("=== CREATING LEAFLET MAP ===");
const map = L.map('map').setView([56.4619, -3.0430], 11); // Centered around the data area (Scotland)
console.log("Leaflet map created:", map);

// Add CartoDB Positron tile layer (matches original demo)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// Load CSV data
async function loadCSVData(url) {
    try {
        const data = await d3.csv(url);
        return data;
    } catch (error) {
        console.error("Error loading CSV data:", error);
        return [];
    }
}

// Aggregation function - appends all records to each grid square
function appendRecordsAggrFn(cell, row, weight, global, panel) {
    if (!cell.records) cell.records = []; // if the cell doesn't have a records property, make one
    cell.records.push(row); // append the record
}

// Post-aggregation function - calculates averages for each variable
function summariseVariablesPostAggr(listOfVariables) {
    return function postAggrFn(cells, cellSize, global, panel) {
        for (const cell of cells) {
            cell.averages = {};
            for (const variable of listOfVariables) {
                if (cell.records) {
                    cell.averages[variable] = d3.mean(
                        cell.records.map((row) => +row[variable])
                    );
                }
            }
        }
        global.maxes = {};
        for (const variable of listOfVariables) {
            global.maxes[variable] = d3.max(
                cells.map((row) => row.averages[variable])
            );
        }
    };
}

// Optimized drawing function - draws small squares representing each variable
function drawFnSquares(cell, x, y, cellSize, ctx, global, panel) {
    if (!cell || !cell.records || cell.records.length === 0) return;
    
    const padding = 2;
    const cellWidth = (cellSize - 2 * padding) / 3;
    const cellHeight = (cellSize - 2 * padding) / 2;

    // Draw cell background (subtle color for visibility)
    ctx.fillStyle = "#cccb"; // Light gray background like in new-demo
    ctx.fillRect(
        x - cellSize / 2 + padding, 
        y - cellSize / 2 + padding, 
        cellSize - padding * 2, 
        cellSize - padding * 2
    );

    // Use averages if available, otherwise use first record
    const rec = cell.averages || cell.records[0];
    
    // Pre-calculate common values
    const baseX = x - cellSize / 2 + padding;
    const baseY = y - cellSize / 2 + padding;
    const minDimension = Math.min(cellWidth, cellHeight);

    // Draw 2x3 grid of squares
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
            const index = row * 3 + col;
            const value = rec[selected_variables[index]] || 0;
            const size = (value / 100) * minDimension;
            
            if (size > 1) { // Only draw if size is meaningful
                const centerX = col * cellWidth + cellWidth / 2 - size / 2;
                const centerY = row * cellHeight + cellHeight / 2 - size / 2;
                
                ctx.fillStyle = colours[index];
                ctx.fillRect(
                    baseX + centerX,
                    baseY + centerY,
                    size,
                    size
                );
            }
        }
    }
}

// Add debug info display
function createDebugPanel() {
    const debugPanel = L.control({position: 'topright'});
    debugPanel.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'debug-panel');
        div.innerHTML = `
            <div style="background: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
                <strong>Tiled GriddedGlyph Debug</strong><br>
                <div id="debug-zoom">Zoom: ${map.getZoom()}</div>
                <div id="debug-tiles">Tiles: Loading...</div>
                <div id="debug-data">Data: Loading...</div>
            </div>
        `;
        return div;
    };
    return debugPanel;
}

// Load data and create the tiled glyph layer
loadCSVData(csvDataPath).then(data => {
    if (data.length === 0) {
        console.error("No data loaded, cannot create glyph layer");
        return;
    }

    console.log(`[TiledDemo] Loaded ${data.length} data points`);
    console.log(`[TiledDemo] Using TILED implementation for performance comparison`);
    
    // Debug: Check data bounds
    const lats = data.map(d => +d.lat);
    const longs = data.map(d => +d.long);
    console.log(`[TiledDemo] Data bounds: lat [${Math.min(...lats)}, ${Math.max(...lats)}], lng [${Math.min(...longs)}, ${Math.max(...longs)}]`);

    // Optimize data conversion - do it once upfront
    const processedData = data.map(row => ({
        lat: +row.lat,
        long: +row.long,
        acc_supermarket: +row.acc_supermarket,
        acc_hospitals: +row.acc_hospitals,
        acc_gp: +row.acc_gp,
        acc_school: +row.acc_school,
        acc_employment: +row.acc_employment,
        acc_urbancentre: +row.acc_urbancentre
    }));

    // Center the map on the data
    const bounds = L.latLngBounds(processedData.map(d => [d.lat, d.long]));
    map.fitBounds(bounds);

    // Create and add the tiled gridded glyph layer with same config as new-demo
    const tiledGlyphLayer = new TiledGriddedGlyphLayer({
        data: processedData,
        getLocationFn: (row) => [row.long, row.lat], // [lng, lat] format
        cellSize: 40, // Same cell size as new-demo for direct comparison
        discretisationShape: "grid",
        
        // Tile-specific options (optimized for performance)
        tileSize: 256,          // Standard tile size
        minZoom: 6,             // Allow lower zoom to see full extent
        maxZoom: 18,            // Higher max zoom for detail
        updateWhenZooming: false, // Prevent flickering during zoom
        keepBuffer: 2,          // Keep tiles around viewport for smooth panning
        
        glyph: {
            aggrFn: appendRecordsAggrFn,
            postAggrFn: summariseVariablesPostAggr(selected_variables),
            drawFn: drawFnSquares
            // Removed postDrawFn and tooltipTextFn for performance (same as new-demo)
        }
    });
    
    tiledGlyphLayer.addTo(map);
    
    // Add debug panel
    const debugPanel = createDebugPanel();
    debugPanel.addTo(map);
    
    // Update debug info on map events
    let tileCount = 0;
    map.on('zoomend moveend', () => {
        document.getElementById('debug-zoom').textContent = `Zoom: ${map.getZoom()}`;
        
        // Count visible tiles (approximate)
        const mapSize = map.getSize();
        const tileSize = 256;
        const tilesX = Math.ceil(mapSize.x / tileSize) + 2; // +2 for buffer
        const tilesY = Math.ceil(mapSize.y / tileSize) + 2;
        const estimatedTiles = tilesX * tilesY;
        
        document.getElementById('debug-tiles').textContent = `Tiles: ~${estimatedTiles} visible`;
    });
    
    // Update data info
    document.getElementById('debug-data').textContent = `Data: ${processedData.length} points`;
    
    // Performance monitoring and comparison
    let lastRenderTime = Date.now();
    let zoomCount = 0;
    let panCount = 0;
    
    map.on('zoomstart', () => {
        lastRenderTime = Date.now();
    });
    
    map.on('zoomend', () => {
        const renderTime = Date.now() - lastRenderTime;
        zoomCount++;
        console.log(`🚀 [TILED] Zoom ${zoomCount} completed in ${renderTime}ms (Level: ${map.getZoom()})`);
    });
    
    map.on('movestart', () => {
        lastRenderTime = Date.now();
    });
    
    map.on('moveend', () => {
        const renderTime = Date.now() - lastRenderTime;
        panCount++;
        if (renderTime > 50) { // Only log slower operations
            console.log(`🚀 [TILED] Pan ${panCount} completed in ${renderTime}ms`);
        }
    });
    
    // Add layer controls for comparison (if original layer is available)
    const layerControl = L.control.layers(
        {}, // No base layers to switch
        {
            "Tiled Gridded Glyphs": tiledGlyphLayer
        },
        { position: 'topleft' }
    );
    layerControl.addTo(map);
    
    console.log("[TiledDemo] Tiled gridded glyph layer initialized successfully");

}).catch(error => {
    console.error("Error in tiled demo setup:", error);
});
