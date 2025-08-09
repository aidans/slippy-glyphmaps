// plugins for rollup
// import commonjs from "@rollup/plugin-commonjs";
import noderesolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";
// import copy from "rollup-plugin-copy";
// import del from "rollup-plugin-delete";

export default {
  input: "src/index.js",
  output: {
    format: "esm",
    file: "dist/gridded-glyphmaps.leaflet.min.js",
  },
  external: ["leaflet", "d3"],
  plugins: [
    // commonjs(),
    noderesolve(),
    babel({ babelHelpers: "bundled" }), // transpilation
    terser(),
    // del({
    //   targets: "/var/www/html/npm_test/griddedglyphs/index.min.js",
    //   force: true,
    // }),
    // copy({
    //   targets: [
    //     { src: "dist/index.min.js", dest: "/var/www/html/npm_test/griddedglyphs" },
    //   ],
    // }),
  ],
  watch: {
    include: 'src/**',
    exclude: 'node_modules/**'
  }
};