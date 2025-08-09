# Gridded-glyphmap Library


## How to build

* `git clone` this repository
* `npm install` 
* `npm run build`

Resulting library will be available in `dist/index.min.js`.


## How to use

Gridded-glypmap will be available as ESM library, so this will work:

`import {glyphMap, heatmapGlyph} from '../dist/index.min.js';`

Subsequently, the Glyphmap can be declared as such:
`const container = glyphMap({glyphmap options here})`

We can then put the container into any div, such as: 
`const parentDiv = document.querySelector('#map');`

Please see examples for more information.