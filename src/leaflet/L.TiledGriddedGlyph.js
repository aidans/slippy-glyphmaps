import * as L from 'leaflet';
import * as d3 from 'd3';

import { _getGridDiscretiser } from '../griddiscretizer.js';
import { _getHexDiscretiser } from '../hexdiscretizer.js';
import { _generate2DHeatMap } from '../heatmap2d.js';
import { _kernelSmooth } from '../kernelsmooth.js';
import { _blur } from '../blur.js';

/**
 * A tiled implementation of GriddedGlyph using L.GridLayer for better performance
 * and proper Leaflet integration. This addresses coordinate handling issues and
 * provides scalable rendering for large datasets.
 */
export const TiledGriddedGlyphLayer = L.GridLayer.extend({
    initialize: function (options) {
        // Set default tile size and other GridLayer options
        const defaultOptions = {
            tileSize: 256,        // Standard tile size
            minZoom: 1,
            maxZoom: 18,
            updateWhenZooming: false,  // Prevent flickering during zoom
            keepBuffer: 2,             // Keep tiles around viewport for smooth panning
            ...options
        };
        
        L.GridLayer.prototype.initialize.call(this, defaultOptions);
        
        // Glyph-specific options
        this.options.cellSize = this.options.cellSize || 5;
        this.options.discretisationShape = this.options.discretisationShape || 'grid';
        this.options.getLocationFn = this.options.getLocationFn || ((row) => [row.lon, row.lat]);
        this.options.discretiserFn = this.options.discretiserFn || _generate2DHeatMap;
        
        // Global state shared across all tiles
        this.global = {};
        
        // Spatial index for fast data lookups per tile
        this._dataIndex = null;
        this._previousCellSize = null;
        
        this._setupAggregationFunctions();
        this._setupDiscretiser();
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

    _setupDiscretiser: function() {
        const { cellSize, discretisationShape } = this.options;
        if (!this.discretiser || this._previousCellSize !== cellSize) {
            if (discretisationShape === 'grid') {
                this.discretiser = _getGridDiscretiser(cellSize);
            } else if (discretisationShape === 'hex') {
                this.discretiser = _getHexDiscretiser(cellSize);
            }
            this._previousCellSize = cellSize;
        }
        this.global.discretiser = this.discretiser;
    },

    onAdd: function (map) {
        L.GridLayer.prototype.onAdd.call(this, map);
        
        // Initialize the data index when added to map
        this._buildDataIndex();
        
        // Call init function if it exists
        if (this.options.glyph?.initFn) {
            this.options.glyph.initFn([], this.options.cellSize, this.global, this);
        }
    },

    createTile: function (coords) {
        console.log(`[TiledGlyph] Creating tile ${coords.z}:${coords.x}:${coords.y} (SYNCHRONOUS)`);
        
        const tile = L.DomUtil.create('canvas', 'leaflet-tile');
        const size = this.getTileSize();
        
        tile.width = size.x;
        tile.height = size.y;
        
        const ctx = tile.getContext('2d');
        
        // Get the geographic bounds of this tile
        const tileBounds = this._tileCoordsToBounds(coords);
        
        // Create coordinate transformation functions for this specific tile
        const transforms = this._createTileTransforms(coords, tileBounds, size);
        
        // Render the glyphs for this tile
        this._renderTileGlyphs(ctx, tileBounds, size, transforms, coords);
        
        console.log(`[TiledGlyph] Tile ${coords.z}:${coords.x}:${coords.y} rendering complete (SYNCHRONOUS)`);
        
        return tile;
    },

    _createTileTransforms: function(coords, tileBounds, tileSize) {
        // Create coordinate transformation functions specific to this tile
        const coordToTilePixelFn = (coord) => {
            // coord is [lon, lat]
            const latLng = L.latLng(coord[1], coord[0]);
            
            // Convert to tile-relative pixel coordinates
            const nwPoint = this._map.project(tileBounds.getNorthWest(), coords.z);
            const pointInTileCoords = this._map.project(latLng, coords.z);
            
            const tileX = pointInTileCoords.x - nwPoint.x;
            const tileY = pointInTileCoords.y - nwPoint.y;
            
            // Warn only for extremely large coordinates (likely errors)
            if (Math.abs(tileX) > 10000 || Math.abs(tileY) > 10000) {
                console.warn(`[TileTransform] Very large coordinate: ${coord} -> [${tileX}, ${tileY}]`);
            }
            
            // Always return coordinates, even if outside tile bounds
            // The discretization functions will handle filtering
            return [tileX, tileY];
        };

        const tilePixelToCoordFn = (pixel) => {
            // Convert tile pixel back to geographic coordinates
            const nwPoint = this._map.project(tileBounds.getNorthWest(), coords.z);
            const worldPoint = L.point(
                nwPoint.x + pixel[0],
                nwPoint.y + pixel[1]
            );
            const latLng = this._map.unproject(worldPoint, coords.z);
            return [latLng.lng, latLng.lat];
        };

        return {
            coordToTilePixelFn,
            tilePixelToCoordFn
        };
    },

    _renderTileGlyphs: function(ctx, tileBounds, tileSize, transforms, coords) {
        // Get data points that fall within this tile
        const tileData = this._getDataForTile(tileBounds);
        
        console.log(`[TiledGlyph] Rendering tile ${coords.z}:${coords.x}:${coords.y}, found ${tileData?.length || 0} data points`);
        console.log(`[TiledGlyph] Tile bounds:`, tileBounds.toBBoxString());
        
        if (!tileData || tileData.length === 0) {
            console.log(`[TiledGlyph] No data in tile ${coords.z}:${coords.x}:${coords.y}, skipping`);
            return; // No data in this tile
        }

        // Debug: Test coordinate transformation before grid generation
        if (tileData.length > 0) {
            const samplePoint = tileData[0];
            const location = this.options.getLocationFn(samplePoint);
            const tileCoord = transforms.coordToTilePixelFn(location);
            console.log(`[TiledGlyph] BEFORE GRID: Sample point ${location} -> tile coord ${tileCoord}`);
            console.log(`[TiledGlyph] Tile size: ${tileSize.x}x${tileSize.y}, cellSize: ${this.options.cellSize}`);
            
            // Test if coordinates are reasonable
            if (isNaN(tileCoord[0]) || isNaN(tileCoord[1])) {
                console.error(`[TiledGlyph] NaN coordinates detected! Location: ${location}, tileCoord: ${tileCoord}`);
                return; // Skip this tile if coordinates are invalid
            }
        }

        // Create a grid for this tile using the discretization function
        const grid = this.options.discretiserFn({
            data: tileData,
            width: tileSize.x,
            height: tileSize.y,
            getLocationFn: this.options.getLocationFn,
            coordToScreenFn: transforms.coordToTilePixelFn,
            screenToCoordFn: transforms.tilePixelToCoordFn,
            cellSize: this.options.cellSize,
            discretiser: this.discretiser,
            aggrFn: this.options.aggrFn,
            postAggrFn: this.options.postAggrFn,
            global: this.global,
            panel: this,
        });

        console.log(`[TiledGlyph] Generated grid for tile ${coords.z}:${coords.x}:${coords.y}:`, grid?.length || 0, 'rows');
        if (grid && grid.length > 0) {
            const populatedCells = grid.flat().filter(c => c);
            console.log(`[TiledGlyph] Found ${populatedCells.length} populated cells`);
            
            // Debug first few data points and their transformations
            if (tileData.length > 0) {
                const samplePoint = tileData[0];
                const location = this.options.getLocationFn(samplePoint);
                const tileCoord = transforms.coordToTilePixelFn(location);
                console.log(`[TiledGlyph] Sample transformation: ${location} -> ${tileCoord}`);
            }
        }

        // Apply kernel smoothing if specified
        if (this.options.kernelBW && this.options.kernelBW > 0) {
            const smoothFn = this.options.useBlur ? _blur : _kernelSmooth;
            smoothFn({
                grid: grid,
                properties: this.options.glyph?.kernelSmoothProperties,
                propertyTypes: this.options.glyph?.kernelSmoothPropertyTypes,
                discretiser: this.discretiser,
                kernelRadius: this.options.useBlur ? Math.trunc(this.options.kernelBW / 2) : this.options.kernelBW,
            });
        }

        // Render the glyphs on this tile
        this._drawGlyphsOnTile(ctx, grid, coords);
    },

    _drawGlyphsOnTile: function(ctx, grid, coords) {
        const { cellSize } = this.options;
        
        console.log(`[TiledGlyph] Drawing glyphs on tile ${coords.z}:${coords.x}:${coords.y} (${grid?.length || 0} cols, canvas: ${ctx.canvas.width}x${ctx.canvas.height})`);
        
        // Helper function to get all spatial units from sparse grid
        const getAllSpatialUnits = (grid) => {
            const units = [];
            for (let col = 0; col < grid.length; col++) {
                if (!grid[col]) continue;
                for (let row = 0; row < grid[col].length; row++) {
                    if (grid[col][row]) units.push(grid[col][row]);
                }
            }
            return units;
        };
        
        // Pre-draw function
        if (this.options.glyph?.preDrawFn) {
            ctx.save();
            this.options.glyph.preDrawFn(getAllSpatialUnits(grid), cellSize, ctx, this.global, this);
            ctx.restore();
        }

        // Main drawing function
        if (this.options.glyph?.drawFn) {
            ctx.save();
            const drawFns = Array.isArray(this.options.glyph.drawFn) ? 
                this.options.glyph.drawFn : [this.options.glyph.drawFn];
            
            let cellsDrawn = 0;
            let cellsSkipped = 0;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            
            for (const theDrawFn of drawFns) {
                // Handle sparse grid structure properly
                // grid is a sparse 2D array: grid[col][row] = spatialUnit
                for (let col = 0; col < grid.length; col++) {
                    if (!grid[col]) continue; // Skip empty columns
                    
                    for (let row = 0; row < grid[col].length; row++) {
                        const spatialUnit = grid[col][row];
                        if (!spatialUnit) continue;
                        
                        const x = spatialUnit.getXCentre();
                        const y = spatialUnit.getYCentre();
                        
                        // Track coordinate ranges for debugging
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                        
                        // Don't skip cells based on bounds - let the draw function handle visibility
                        // This might have been causing the issue!
                        
                        if (cellsDrawn === 0) { // Debug first cell only
                            console.log(`[TiledGlyph] Drawing cell at (${x}, ${y}) with data:`, spatialUnit.records?.length || 0, 'records');
                        }
                        
                        theDrawFn(
                            spatialUnit,
                            x,
                            y,
                            cellSize,
                            ctx,
                            this.global,
                            this
                        );
                        cellsDrawn++;
                    }
                }
            }
            
            console.log(`[TiledGlyph] Drew ${cellsDrawn} cells on tile ${coords.z}:${coords.x}:${coords.y}, coord range: x[${minX.toFixed(1)}, ${maxX.toFixed(1)}], y[${minY.toFixed(1)}, ${maxY.toFixed(1)}]`);
            ctx.restore();
        } else {
            console.warn(`[TiledGlyph] No drawFn provided for tile ${coords.z}:${coords.x}:${coords.y}`);
        }

        // Post-draw function
        if (this.options.glyph?.postDrawFn) {
            ctx.save();
            this.options.glyph.postDrawFn(getAllSpatialUnits(grid), cellSize, ctx, this.global, this);
            ctx.restore();
        }
    },

    _buildDataIndex: function() {
        // Build a spatial index for fast tile-based data retrieval
        if (!this.options.data) {
            this._dataIndex = new Map();
            return;
        }

        // Skip indexing if map is not available yet - we'll use simple bounds checking
        if (!this._map) {
            console.log(`[TiledGriddedGlyph] Map not available yet, will use simple bounds checking`);
            this._dataIndex = null;
            return;
        }

        console.log(`[TiledGriddedGlyph] Building spatial index for ${this.options.data.length} data points...`);
        
        this._dataIndex = new Map();
        
        // Group data points by their containing tiles at a reference zoom level
        const indexZoom = Math.min(10, this.options.maxZoom); // Use zoom 10 for indexing
        
        for (const dataPoint of this.options.data) {
            const location = this.options.getLocationFn(dataPoint);
            if (!location || location.length < 2) continue;
            
            const latLng = L.latLng(location[1], location[0]);
            const point = this._map.project(latLng, indexZoom);
            const tilePoint = point.divideBy(this.getTileSize().x).floor();
            const tileKey = `${indexZoom}:${tilePoint.x}:${tilePoint.y}`;
            
            if (!this._dataIndex.has(tileKey)) {
                this._dataIndex.set(tileKey, []);
            }
            this._dataIndex.get(tileKey).push(dataPoint);
        }
        
        console.log(`[TiledGriddedGlyph] Spatial index built with ${this._dataIndex.size} tile buckets`);
    },

    _getDataForTile: function(tileBounds) {
        if (!this.options.data) {
            return [];
        }

        // Filter data points that fall within this tile's bounds
        const tileData = [];
        
        // Use a larger buffer to ensure we don't miss edge cases
        const tileLatSpan = tileBounds.getNorth() - tileBounds.getSouth();
        const tileLngSpan = tileBounds.getEast() - tileBounds.getWest();
        
        // Increase buffer to 50% of tile size to be more generous with edge effects
        const latBuffer = tileLatSpan * 0.5;
        const lngBuffer = tileLngSpan * 0.5;
        
        const bufferedBounds = L.latLngBounds(
            [tileBounds.getSouth() - latBuffer, tileBounds.getWest() - lngBuffer],
            [tileBounds.getNorth() + latBuffer, tileBounds.getEast() + lngBuffer]
        );
        
        // Debug data bounds only once to avoid log spam
        if (this.options.data.length > 0 && !this._loggedDataBounds) {
            const allLats = this.options.data.map(d => this.options.getLocationFn(d)[1]);
            const allLngs = this.options.data.map(d => this.options.getLocationFn(d)[0]);
            const dataBounds = {
                minLat: Math.min(...allLats), maxLat: Math.max(...allLats),
                minLng: Math.min(...allLngs), maxLng: Math.max(...allLngs)
            };
            console.log(`[TiledGlyph] Data bounds: lat[${dataBounds.minLat}, ${dataBounds.maxLat}], lng[${dataBounds.minLng}, ${dataBounds.maxLng}]`);
            console.log(`[TiledGlyph] Tile bounds: ${tileBounds.toBBoxString()}`);
            console.log(`[TiledGlyph] Buffered bounds: ${bufferedBounds.toBBoxString()}`);
            this._loggedDataBounds = true;
        }
        
        let totalChecked = 0;
        let withinBounds = 0;
        
        for (const dataPoint of this.options.data) {
            const location = this.options.getLocationFn(dataPoint);
            if (!location || location.length < 2) continue;
            
            totalChecked++;
            const latLng = L.latLng(location[1], location[0]);
            
            if (bufferedBounds.contains(latLng)) {
                tileData.push(dataPoint);
                withinBounds++;
            }
        }
        
        if (tileData.length === 0 && totalChecked > 0) {
            console.log(`[TiledGlyph] Checked ${totalChecked} points, ${withinBounds} within buffered bounds for tile`);
            // Log a few sample points to debug coordinate issues
            const sampleSize = Math.min(3, this.options.data.length);
            for (let i = 0; i < sampleSize; i++) {
                const location = this.options.getLocationFn(this.options.data[i]);
                console.log(`[TiledGlyph] Sample point ${i}: [${location[0]}, ${location[1]}]`);
            }
        }
        
        return tileData;
    },

    setData: function(data) {
        this.options.data = data;
        this._buildDataIndex();
        this.redraw(); // Redraw all tiles with new data
    },
    
    setOptions: function(newOptions) {
        L.Util.setOptions(this, newOptions);
        this._setupAggregationFunctions();
        this._setupDiscretiser();
        
        // Rebuild index if data changed
        if (newOptions.data) {
            this._buildDataIndex();
        }
        
        this.redraw();
    },

    // Override for better debugging
    _tileReady: function(coords, err, tile) {
        if (err) {
            console.warn(`[TiledGriddedGlyph] Tile error at ${coords.z}:${coords.x}:${coords.y}`, err);
        }
        L.GridLayer.prototype._tileReady.call(this, coords, err, tile);
    }
});

// Factory function
export const tiledGriddedGlyphLayer = function(options) {
    return new TiledGriddedGlyphLayer(options);
};
