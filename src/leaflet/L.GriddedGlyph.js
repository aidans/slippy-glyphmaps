import * as L from 'leaflet';
import * as d3 from 'd3';
import { CanvasLayer } from './L.CanvasLayer.js';

import { _getGridDiscretiser } from '../griddiscretizer.js';
import { _getHexDiscretiser } from '../hexdiscretizer.js';
import { _generate2DHeatMap } from '../heatmap2d.js';
import { _kernelSmooth } from '../kernelsmooth.js';
import { _blur } from '../blur.js';

export const GriddedGlyphLayer = CanvasLayer.extend({
    initialize: function (options) {
        CanvasLayer.prototype.initialize.call(this, options);
        this.options.cellSize = this.options.cellSize ? this.options.cellSize : 5;
        this.options.discretisationShape = this.options.discretisationShape ? this.options.discretisationShape : 'grid';
        this.options.getLocationFn = this.options.getLocationFn ? this.options.getLocationFn : (row) => [row.lon, row.lat];
        this.options.discretiserFn = this.options.discretiserFn ? this.options.discretiserFn : _generate2DHeatMap;

        this.global = {};
        this.grid = [];
        this._setupAggregationFunctions();
    },

    onAdd: function (map) {
        console.log("[Glyph Layer] onAdd called with map:", map);
        CanvasLayer.prototype.onAdd.call(this, map);
        
        // Call initFn if it exists
        if (this.options.glyph?.initFn) {
            console.log("[Glyph Layer] Calling initFn");
            this.options.glyph.initFn([], this.options.cellSize, this.global, this);
        }
        
        console.log("[Glyph Layer] Calling needRedraw");
        this.needRedraw();
    },

    _setupAggregationFunctions: function() {
        const { type, colourFieldFn, glyph } = this.options;
        if (glyph) {
            this.options.aggrFn = glyph.aggrFn;
            this.options.postAggrFn = glyph.postAggrFn;
            this.options.preAggrFn = glyph.preAggrFn;
            this.options.preDrawFn = glyph.preDrawFn;
            this.options.drawFn = glyph.drawFn;
            this.options.postDrawFn = glyph.postDrawFn;
            this.options.initFn = glyph.initFn;
            this.options.tooltipTextFn = glyph.tooltipTextFn;
        } else if (type === 'count') {
            this.options.aggrFn = (cell, row, weight) => (cell.value = (cell.value ?? 0) + weight);
        } else if (type === 'sum') {
            this.options.aggrFn = (cell, row, weight) => (cell.value = (cell.value ?? 0) + colourFieldFn(row) * weight);
        } else if (type === 'mean') {
            this.options.aggrFn = (cell, row, weight) => {
                cell.sum = (cell.sum ?? 0) + colourFieldFn(row) * weight;
                cell.count = (cell.count ?? 0) + 1;
            };
            this.options.postAggrFn = (cells) => {
                for (const cell of cells.flat()) {
                    if (cell && cell.count > 0) cell.value = cell.sum / cell.count;
                }
            };
        }
    },

    onDrawLayer: function (info) {
        console.log("[Glyph Layer] onDrawLayer called. Zoom:", info.zoom);
        console.log("[Glyph Layer] Canvas size:", info.size);
        console.log("[Glyph Layer] Map bounds:", this._map.getBounds());
        console.log("[Glyph Layer] Map center:", this._map.getCenter());
        console.log("[Glyph Layer] Map zoom:", this._map.getZoom());
        
        const ctx = info.canvas.getContext('2d');
        ctx.clearRect(0, 0, info.canvas.width, info.canvas.height);

        let { cellSize, discretisationShape, kernelBW, reduceMaup, data } = this.options;

        // Check if we need to re-discretize
        if (!this.discretiser || this._previousCellSize !== cellSize) {
            if (discretisationShape === 'grid') this.discretiser = _getGridDiscretiser(cellSize);
            else if (discretisationShape === 'hex') this.discretiser = _getHexDiscretiser(cellSize);
        }
        this.global.discretiser = this.discretiser;

        // Call initFn if it exists
        if (this.options.glyph?.initFn) {
            this.options.glyph.initFn([], cellSize, this.global, this);
        }

        const coordToScreenFn = (coord) => {
            // coord should be [lon, lat] from getLocationFn
            // Convert to Leaflet latLng and then to canvas point
            const latLng = L.latLng(coord[1], coord[0]);
            const containerPoint = this._map.latLngToContainerPoint(latLng);
            // The canvas is positioned at the top-left of the map, so we can use containerPoint directly
            const result = [containerPoint.x, containerPoint.y];
            console.log(`[coordToScreenFn] Input: [${coord[0]}, ${coord[1]}], Output: [${result[0]}, ${result[1]}]`);
            
            // Check if coordinates are within bounds
            if (result[0] < 0 || result[0] > info.size.x || result[1] < 0 || result[1] > info.size.y) {
                console.warn(`[coordToScreenFn] Coordinate [${result[0]}, ${result[1]}] is outside canvas bounds [0, 0, ${info.size.x}, ${info.size.y}]`);
            }
            
            return result;
        };

        const screenToCoordFn = (point) => {
            // Convert canvas point back to latLng
            const containerPoint = L.point(point[0], point[1]);
            const latLng = this._map.containerPointToLatLng(containerPoint);
            return [latLng.lng, latLng.lat];
        };

        this.grid = this.options.discretiserFn({
            data: data,
            width: info.size.x,
            height: info.size.y,
            getLocationFn: this.options.getLocationFn,
            coordToScreenFn,
            screenToCoordFn,
            cellSize,
            discretiser: this.discretiser,
            aggrFn: this.options.aggrFn,
            postAggrFn: this.options.postAggrFn,
            global: this.global,
            panel: this, // Pass the layer instance as the panel
            // ... other options from the original implementation
        });

        console.log("[Glyph Layer] Grid generated:", this.grid);
        console.log("[Glyph Layer] Grid dimensions:", this.grid.length, "x", this.grid[0] ? this.grid[0].length : 0);
        const populatedCells = this.grid.flat().filter(c => c);
        console.log(`[Glyph Layer] Grid generated. Found ${populatedCells.length} populated cells.`);
        
        // Debug: Check if populated cells have ts data
        if (populatedCells.length > 0) {
            const sampleCell = populatedCells[0];
            console.log("[Glyph Layer] Sample cell:", sampleCell);
            console.log("[Glyph Layer] Sample cell has ts:", !!sampleCell.ts);
            if (sampleCell.ts) {
                console.log("[Glyph Layer] Sample cell ts length:", sampleCell.ts.length);
            }
        } else {
            console.log("[Glyph Layer] No populated cells found. Checking coordinate transformation...");
            // Debug: Check a sample coordinate
            if (data.length > 0) {
                const sampleData = data[0];
                const location = this.options.getLocationFn(sampleData);
                const screenCoord = coordToScreenFn(location);
                console.log("[Glyph Layer] Sample data location:", location);
                console.log("[Glyph Layer] Sample screen coord:", screenCoord);
                console.log("[Glyph Layer] Canvas size:", info.size);
                
                // Check if coordinates are within bounds
                const bounds = this._map.getBounds();
                console.log("[Glyph Layer] Map bounds:", bounds);
                console.log("[Glyph Layer] Sample location within bounds:", bounds.contains(L.latLng(location[1], location[0])));
                
                // Debug: Check if coordinates are being transformed correctly
                const latLng = L.latLng(location[1], location[0]);
                const containerPoint = this._map.latLngToContainerPoint(latLng);
                console.log("[Glyph Layer] Direct transformation:", containerPoint);
                console.log("[Glyph Layer] Screen coord from function:", screenCoord);
            }
        }

        this._previousCellSize = cellSize;

        if (kernelBW && kernelBW > 0) {
            const smoothFn = this.options.useBlur ? _blur : _kernelSmooth;
            smoothFn({
                grid: this.grid,
                properties: this.options.glyph?.kernelSmoothProperties,
                propertyTypes: this.options.glyph?.kernelSmoothPropertyTypes,
                discretiser: this.discretiser,
                kernelRadius: this.options.useBlur ? Math.trunc(kernelBW / 2) : kernelBW,
            });
        }

        // --- Drawing Logic ---
        if (this.options.glyph?.preDrawFn) {
            ctx.save();
            this.options.glyph.preDrawFn(this.grid.flat(), cellSize, ctx, this.global, this);
            ctx.restore();
        }

        if (this.options.glyph?.drawFn) {
            console.log("[Glyph Layer] Executing custom drawFn.");
            ctx.save();
            const drawFns = Array.isArray(this.options.glyph.drawFn) ? this.options.glyph.drawFn : [this.options.glyph.drawFn];
            for (const theDrawFn of drawFns) {
                for (const spatialUnit of this.grid.flat()) {
                    if (!spatialUnit) continue;
                    theDrawFn(
                        spatialUnit,
                        spatialUnit.getXCentre(),
                        spatialUnit.getYCentre(),
                        cellSize,
                        ctx,
                        this.global,
                        this
                    );
                }
            }
            ctx.restore();
        }

        if (this.options.glyph?.postDrawFn) {
            ctx.save();
            this.options.glyph.postDrawFn(this.grid.flat(), cellSize, ctx, this.global, this);
            ctx.restore();
        }
    },

    setData: function(data) {
        this.options.data = data;
        this.needRedraw();
    },
    
    setOptions: function(newOptions) {
        L.Util.setOptions(this, newOptions);
        this._setupAggregationFunctions();
        this.needRedraw();
    }
});