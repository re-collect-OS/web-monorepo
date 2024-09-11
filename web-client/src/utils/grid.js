export const pxToGrid = function (val, cellDim) {
  return Math.round(val / cellDim);
};

export const gridToPx = function (val, cellDim) {
  return val * cellDim;
};

export const snapToGrid = function (val, cellDim) {
  return pxToGrid(val, cellDim) * cellDim;
};
