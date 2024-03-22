export const _setupParamFns = (options) => {
  const name = options.name;
  const decKey = options.decKey; //can be LEFT, SHIFT_LEFT or the char itself
  const incKey = options.incKey; //can be RIGHT, SHIFT_RIGHT or the char itself
  const resetKey = options.resetKey;
  const incDecType = options.incDecType;
  const decFn = options.decFn ? options.decFn : (v) => v - 1;
  const incFn = options.incFn ? options.incFn : (v) => v + 1;
  // const resetFn = options.resetFn
  //   ? options.resetFn
  //   : cellValueFn
  //   ? d3.max
  //   : undefined;
  const numberFormatFn = options.numberFormatFn
    ? options.numberFormatFn
    : (value) => +value.toFixed();
  const resetFn = options.resetFn;
  const resetType = options.resetType ? options.resetType : "preDraw"; //"preAggr" or "preDraw"
  let autoscale = options.autoscale !== undefined ? options.autoscale : false;
  const onChangeFn = options.onChangeFn;

  const doInc = (global, panel) => {
    global[name] != undefined
      ? (global[name] = incFn(global[name]))
      : undefined;
    if (onChangeFn) onChangeFn(global);
    panel.redraw();
  };
  const doDec = (global, panel) => {
    global[name] != undefined
      ? (global[name] = decFn(global[name]))
      : undefined;
    if (onChangeFn) onChangeFn(global);
    panel.redraw();
  };
  const doReset = (global, panel) => {
    global[name] = undefined;
    if (onChangeFn) onChangeFn(global);
    panel.redraw();
  };

  const getAutoscale = () => autoscale;

  const toggleAutoscale = () => {
    autoscale = !autoscale;
  };

  return {
    ...options,

    initFn: (grid, cellSize, global, panel) => {
      panel.addEventListener("keydown", (event) => {
        //decrement
        if (
          (decKey &&
            decKey.startsWith("SHIFT_") === event.shiftKey &&
            ((decKey.endsWith("LEFT") && event.keyCode == 37) ||
              (decKey.endsWith("RIGHT") && event.keyCode == 39))) ||
          event.key === decKey
        ) {
          event.preventDefault();
          doDec(global, panel);
        }
        //increment
        if (
          (incKey &&
            incKey.startsWith("SHIFT_") === event.shiftKey &&
            ((incKey.endsWith("LEFT") && event.keyCode == 37) ||
              (incKey.endsWith("RIGHT") && event.keyCode == 39))) ||
          event.key === incKey
        ) {
          event.preventDefault();
          doInc(global, panel);
        }
        //reset key
        if (resetKey && event.key == resetKey) {
          event.preventDefault();
          doReset(global, panel);
        }
      });
    },

    toggleAutoscale: toggleAutoscale,

    getAutoscale: getAutoscale,

    preAggrFn:
      resetType == "preAggr"
        ? (cells, cellSize, ctx, global, panel) => {
            if (resetFn && (getAutoscale() || global[name] === undefined)) {
              global[name] = resetFn(cells.flat(), cellSize, panel);
            }
          }
        : undefined,

    preDrawFn:
      resetType == "preDraw"
        ? (cells, cellSize, ctx, global, panel) => {
            if (resetFn && (getAutoscale() || global[name] === undefined)) {
              global[name] = resetFn(cells.flat(), cellSize, panel);
            }
          }
        : undefined,
    doInc, //methods defined above, so other methods (i.e. mouseclick can do it)
    doDec,
    doReset,
    numberFormatFn,
  };
};
