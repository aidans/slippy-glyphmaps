import * as d3 from "d3";
import * as L from "leaflet";
import { GriddedGlyphLayer } from "../dist/gridded-glyphmaps.leaflet.min.js";

// Removed excessive console logging for performance

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
const map = L.map('map').setView([56.4619, -3.0430], 11); // Centered around the data area (Scotland)

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

    // Draw cell background (simplified for performance)
    ctx.fillStyle = "#cccb";
    ctx.fillRect(
        x - cellSize / 2 + padding, 
        y - cellSize / 2 + padding, 
        cellSize - padding * 2, 
        cellSize - padding * 2
    );

    // Only draw for the first record to improve performance
    // (or use averages if you have them from postAggrFn)
    const rec = cell.averages || cell.records[0];
    
    // Pre-calculate common values
    const baseX = x - cellSize / 2 + padding;
    const baseY = y - cellSize / 2 + padding;
    const minDimension = Math.min(cellWidth, cellHeight);

    // Draw 2x3 grid of squares with optimized rendering
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

// COMMENTED OUT FOR PERFORMANCE TESTING
// TODO: Refactor to use Leaflet's native tooltip and legend APIs

// Legend drawing function - DISABLED FOR PERFORMANCE
// function drawLegend(grid, cellSize, ctx, global, panel) {
//     ctx.font = "10px sans-serif";
//     ctx.textAlign = "left";
//     ctx.textBaseline = "middle";
//     const maxTextWidth = d3.max(
//         selected_variables.map((item) => ctx.measureText(item).width)
//     );
//     const x = panel.getWidth() - maxTextWidth - 20;
//     let y = panel.getHeight() - selected_variables.length * 15;
//     ctx.fillStyle = "#fff8";
//     ctx.fillRect(x, y, maxTextWidth + 15, selected_variables.length * 15);
//     for (let i = 0; i < selected_variables.length; i++) {
//         ctx.fillStyle = colours[i];
//         ctx.fillRect(x, y, 10, 10);
//         ctx.fillStyle = "#333";
//         ctx.fillText(selected_variables[i], x + 15, y + 5);
//         y += 15;
//     }
// }

// Tooltip function - DISABLED FOR PERFORMANCE
// function tooltipTextFn(cell) {
//     if (!cell || !cell.records || !cell.averages) return "";
//     const textBuilder = [];
//     for (const variable of selected_variables) {
//         const average = cell.averages[variable] ?? "-";
//         const percentage = average ? Math.round(average) + "%" : "-";
//         textBuilder.push(`${variable}=${percentage}; <br>`);
//     }
//     return textBuilder.join("").slice(0, -4); // Remove trailing "; "
// }

// Load data and create the glyph layer
loadCSVData(csvDataPath).then(data => {
    if (data.length === 0) {
        console.error("No data loaded, cannot create glyph layer");
        return;
    }

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

    // Create and add the gridded glyph layer with optimized settings
    const glyphLayer = new GriddedGlyphLayer({
        data: processedData,
        getLocationFn: (row) => [row.long, row.lat], // [lng, lat] format
        cellSize: 40, // Slightly larger cells for better performance
        discretisationShape: "grid",
        
        glyph: {
            aggrFn: appendRecordsAggrFn,
            postAggrFn: summariseVariablesPostAggr(selected_variables),
            drawFn: drawFnSquares
            // Removed postDrawFn and tooltipTextFn for performance
        }
    });
    
    glyphLayer.addTo(map);
    
    // Reduced event logging for performance
    map.on('zoomend moveend', () => {
        // Only log on significant zoom changes
        const zoom = map.getZoom();
        if (Math.abs(zoom - (glyphLayer._lastZoom || 0)) > 0.5) {
            glyphLayer._lastZoom = zoom;
        }
    });
}).catch(error => {
    console.error("Error in demo setup:", error);
});
