normalisedData = "./data/urban_parameters.csv"

colours = [
    "#2e8b57ba",
    "#ffa500ba",
    "#00ff00ba",
    "#0000ffba",
    "#1e90ffba",
    "#ff1493ba"
  ]

selected_variables = ["acc_supermarket", "acc_hospitals", "acc_gp", "acc_school", "acc_employment", "acc_urbancentre"]

function glyphMap() {
  return ({
    data: normalisedData,
    getLocationFn: (row) => [row.long, row.lat],
    cellSize: 30,
    mapType: "CartoPositron",
    discretisationShape: "grid",

    width: width,
    height: width * 0.5,
    greyscale: true,
    tileWidth: 150,

    glyph: {
      aggrFn: appendRecordsAggrFn,
      postAggrFn: summariseVariablesPostAggr(selected_variables),
      drawFn: drawFnSquares,
      postDrawFn: drawLegend,
      tooltipTextFn: (cell) => {
        // console.log(cell.records[0]);
        const textBuilder = [];
        for (const variable of selected_variables) {
          const average = cell.averages[variable] ?? "-";
          const percentage = average ? Math.round(average) + "%" : "-";
          textBuilder.push(`${variable}=${percentage}; <br>`);
        }
        const text = textBuilder.join("").slice(0, -4); // Remove trailing "; "

        return text;
      }
    }
  });
}

//Appends all the records to each grid sqaure
function appendRecordsAggrFn(cell, row, weight, global, panel) {
    if (!cell.records) cell.records = []; //if the cell doesn't currently have a records property, make one
    cell.records.push(row); //append the record
  }


// (Use d3) to find the average for each cell (storing as a property of "cell") and the max of
// all cells (storing as a propery of "global")
// Store averages and maxes as key-value pairs as objects
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


  //draw a little barchart of each variable
function drawFnSquares(cell, x, y, cellSize, ctx, global, panel) {
    if (!cell) return;
    const padding = 2;
    // ctx.globalAlpha = 0.5;
  
    var grid_long = cellSize - padding * 2;
    var grid_wide = cellSize - padding * 2;
    //draw cell background
    const boundary = cell.getBoundary(padding);
    // console.log("boundary: ", boundary);
    ctx.fillStyle = "#cccb";
    ctx.beginPath();
    ctx.moveTo(boundary[0][0], boundary[0][1]);
    for (let i = 1; i < boundary.length; i++)
      ctx.lineTo(boundary[i][0], boundary[i][1]);
    ctx.closePath();
    ctx.fill();
  
    var cellWidth = (cellSize - 2 * padding) / 3;
    var cellHeight = (cellSize - 2 * padding) / 2;
  
    for (const rec of cell.records) {
      // console.log("size: ", rec);
      // console.log(rec[selected_variables[0]]);
      // const sizes = [rec[p] for p in selected_variables];
      const sizes = [];
      for (const key of selected_variables) {
        sizes.push(rec[key]);
      }
  
      // ctx.beginPath();
      // ctx.fillRect(
      //   x - cellSize / 2 + padding + row,
      //   y - cellSize / 2 + padding + col,
      //   10,
      //   10
      // );
  
  
      for (var row = 0; row < 2; row++) {
        for (var col = 0; col < 3; col++) {
          // Calculate the index of the square
          var index = row * 3 + col;
          // Calculate the size and position of the square
          var size = (sizes[index] / 100) * Math.min(cellWidth, cellHeight);
          // console.log(colours[index]);
          var centerX = col * cellWidth + cellWidth / 2 - size / 2;
          var centerY = row * cellHeight + cellHeight / 2 - size / 2;
          // Draw the square
          ctx.beginPath();
          ctx.fillRect(
            centerX + x - cellSize / 2 + padding,
            centerY + y - cellSize / 2 + padding,
            size,
            size
          );
          ctx.fillStyle = colours[index];
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "black";
          ctx.stroke();
        }
      } // inner cell iteration
    }
  }


  function drawLegend(grid, cellSize, ctx, global, panel) {
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
  
    const maxTextWidth = d3.max(
      selected_variables.map((item) => ctx.measureText(item).width)
    );
  
    const x = panel.getWidth() - maxTextWidth - 20;
    let y = panel.getHeight() - selected_variables.length * 15;
  
    ctx.fillStyle = "#fff8";
    ctx.fillRect(x, y, maxTextWidth + 15, selected_variables.length * 15);
  
    for (let i = 0; i < selected_variables.length; i++) {
      ctx.fillStyle = colours[i];
      ctx.fillRect(x, y, 10, 10);
      ctx.fillStyle = "#333";
      ctx.fillText(selected_variables[i], x + 15, y + 5);
      y += 15;
    }
  }