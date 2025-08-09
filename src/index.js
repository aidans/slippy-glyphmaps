import * as L from 'leaflet';
import { GriddedGlyphLayer } from './leaflet/L.GriddedGlyph.js';
import { TiledGriddedGlyphLayer } from './leaflet/L.TiledGriddedGlyph.js';

// Helper functions that were previously exported, for advanced customization
import { _drawLegend } from "./drawlegend.js";
import { _blur } from "./blur.js";
import { _getGridDiscretiser } from "./griddiscretizer.js";
import { _getHexDiscretiser } from "./hexdiscretizer.js";
import { _generate2DHeatMap } from "./heatmap2d.js";
import { _setupParamFns } from "./setupparamfns.js";
import { _drawCellBackground } from "./drawcellbackground.js";
import { _kernelSmooth } from "./kernelsmooth.js";
import { heatmapGlyph } from "./heatmapglyphtype.js";
import { createDiscretiserValue } from "./creategriddiscretizer.js";

// Export the layer classes and helper functions for modular use
export {
  GriddedGlyphLayer,         // Original canvas-based implementation
  TiledGriddedGlyphLayer,    // New tiled implementation (recommended)
  _drawLegend,
  _blur,
  _getGridDiscretiser,
  _getHexDiscretiser,
  _generate2DHeatMap,
  _drawCellBackground,
  _setupParamFns,
  _kernelSmooth,
  createDiscretiserValue,
  heatmapGlyph,
};