import { describe, it, expect } from 'vitest';
import { _generate2DHeatMap } from '../src/heatmap2d.js';
import { _getGridDiscretiser } from '../src/griddiscretizer.js';

// Mock coordinate conversion functions (simple 1-to-1 mapping for tests)
const coordToScreenFn = (coord) => [coord[0], coord[1]];
const screenToCoordFn = (point) => [point[0], point[1]];

describe('_generate2DHeatMap', () => {

    const testData = [
        { lon: 10, lat: 10, value: 100 },
        { lon: 15, lat: 15, value: 100 }, // Same cell as point 1
        { lon: 60, lat: 65, value: 20 }, // A different cell
    ];

    const getLocationFn = (row) => [row.lon, row.lat];
    const colourFieldFn = (row) => row.value;

    it('should aggregate points into the correct grid cells', () => {
        const grid = _generate2DHeatMap({
            data: testData,
            width: 100,
            height: 100,
            cellSize: 20,
            getLocationFn,
            coordToScreenFn,
            screenToCoordFn,
            discretiser: _getGridDiscretiser(20),
            aggrFn: (cell, row, weight) => (cell.count = (cell.count ?? 0) + 1),
        });

        const flatGrid = grid.flat().filter(c => c);
        expect(flatGrid.length).toBe(2); // Two cells should have data
        expect(flatGrid[0].count).toBe(2); // First cell should have 2 points
        expect(flatGrid[1].count).toBe(1); // Second cell should have 1 point
    });

    it('should correctly calculate count aggregation', () => {
        const grid = _generate2DHeatMap({
            data: testData,
            width: 100,
            height: 100,
            cellSize: 20,
            getLocationFn,
            coordToScreenFn,
            screenToCoordFn,
            discretiser: _getGridDiscretiser(20),
            aggrFn: (cell, row, weight) => (cell.value = (cell.value ?? 0) + weight),
        });

        const cell1 = grid[0][0];
        const cell2 = grid[3][3];

        expect(cell1.value).toBe(2);
        expect(cell2.value).toBe(1);
    });

    it('should correctly calculate sum aggregation', () => {
        const grid = _generate2DHeatMap({
            data: testData,
            width: 100,
            height: 100,
            cellSize: 20,
            getLocationFn,
            coordToScreenFn,
            screenToCoordFn,
            discretiser: _getGridDiscretiser(20),
            aggrFn: (cell, row, weight) => (cell.value = (cell.value ?? 0) + colourFieldFn(row) * weight),
        });

        const cell1 = grid[0][0];
        const cell2 = grid[3][3];

        expect(cell1.value).toBe(200); // 100 + 100
        expect(cell2.value).toBe(20);  // 20
    });

    it('should correctly calculate mean aggregation', () => {
        let grid;
        const postAggrFn = (cells) => {
            for (const cell of cells.flat()) {
                if (cell && cell.count > 0) cell.value = cell.sum / cell.count;
            }
        };

        const aggrFn = (cell, row, weight) => {
            cell.sum = (cell.sum ?? 0) + colourFieldFn(row) * weight;
            cell.count = (cell.count ?? 0) + 1;
        };

        grid = _generate2DHeatMap({
            data: testData,
            width: 100,
            height: 100,
            cellSize: 20,
            getLocationFn,
            coordToScreenFn,
            screenToCoordFn,
            discretiser: _getGridDiscretiser(20),
            aggrFn,
            postAggrFn,
        });

        const cell1 = grid[0][0];
        const cell2 = grid[3][3];

        expect(cell1.value).toBe(100); // (100 + 100) / 2
        expect(cell2.value).toBe(20);  // 20 / 1
    });
});
