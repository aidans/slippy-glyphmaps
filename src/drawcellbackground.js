export function _drawCellBackground(ctx, cell, colour, padding) {
    const boundary = cell.getBoundary(padding);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(boundary[0][0], boundary[0][1]);
    for (let i = 1; i < boundary.length; i++)
      ctx.lineTo(boundary[i][0], boundary[i][1]);
    ctx.closePath();
    ctx.fill();
  }