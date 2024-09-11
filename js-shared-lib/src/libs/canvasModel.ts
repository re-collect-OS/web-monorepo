interface Point {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  z: number;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ZERO_POINT = { x: 0, y: 0 };
export const ZERO_CAMERA = { x: 0, y: 0, z: 1 };
export const ZERO_RECT = { x: 0, y: 0, width: 0, height: 0 };

export const MIN_ZOOM = 0.25; // Ideal min zoom level - we allow pushing past this if needed
export const MIN_ZOOM_ABSOLUTE = 0.01; // up to 1%
export const MAX_ZOOM = 2; // Maximum zoom level
const ZOOM_STEP = 0.25;
const FIT_TO_SCREEN_PADDING = 45;

export const makeRandomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const makeRandomPoint = (min: number, max: number) => ({
  x: makeRandomNumber(min, max),
  y: makeRandomNumber(min, max),
});

export function screenToCanvas(point: Point, camera: Camera): Point {
  return {
    x: point.x / camera.z - camera.x,
    y: point.y / camera.z - camera.y,
  };
}

export function canvasToScreen(point: Point, camera: Camera): Point {
  return {
    x: (point.x + camera.x) * camera.z,
    y: (point.y + camera.y) * camera.z,
  };
}

export function getViewport(camera: Camera, rect: Rect): Rect {
  const topLeft = screenToCanvas({ x: rect.x, y: rect.y }, camera);
  const bottomRight = screenToCanvas({ x: rect.x + rect.width, y: rect.y + rect.height }, camera);

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return {
    x: camera.x - dx / camera.z,
    y: camera.y - dy / camera.z,
    z: camera.z,
  };
}

export function panIntoView(camera: Camera, screenRect: Rect, rect: Rect): Camera {
  // TODO deal with case where we need to zoom out to fit on screen
  const viewportRect = getInsetRect(getViewport(camera, screenRect), FIT_TO_SCREEN_PADDING);
  const commonRect = getCommonRect([rect, viewportRect]);

  const newCam = { ...camera };
  // Already on screen
  if (commonRect.height === viewportRect.height && commonRect.width === viewportRect.width) {
    return newCam;
  }

  const diffY = Math.abs(commonRect.height - viewportRect.height);
  newCam.y = commonRect.y >= viewportRect.y ? newCam.y - diffY : newCam.y + diffY;

  const diffX = Math.abs(commonRect.width - viewportRect.width);
  newCam.x = commonRect.x >= viewportRect.x ? newCam.x - diffX : newCam.x + diffX;

  return newCam;
}

export function zoomCamera(
  camera: Camera,
  point: Point,
  dz: number,
  min: number = MIN_ZOOM,
  max: number = MAX_ZOOM
): Camera {
  const zoom = Math.min(Math.max(camera.z - dz, min), max);
  // was Math.min(Math.max(camera.z - dz * camera.z, min), max); but why?
  const p1 = screenToCanvas(point, camera);
  const p2 = screenToCanvas(point, { ...camera, z: zoom });

  return {
    x: camera.x + (p2.x - p1.x),
    y: camera.y + (p2.y - p1.y),
    z: zoom,
  };
}

export function zoomToFit(
  camera: Camera,
  screenRect: Rect,
  rect: Rect,
  canZoomOut: boolean,
  min: number = MIN_ZOOM
): Camera {
  let zoom = Math.min(
    (screenRect.width - FIT_TO_SCREEN_PADDING) / rect.width,
    (screenRect.height - FIT_TO_SCREEN_PADDING) / rect.height
  );

  zoom = Math.max(min, camera.z === zoom || camera.z <= 1 ? Math.min(1, zoom) : zoom);
  if (!canZoomOut && zoom > camera.z) {
    zoom = camera.z;
  }

  const newCam = { ...camera };
  newCam.x = (screenRect.x + screenRect.width / 2) / zoom - rect.x - rect.width / 2;
  newCam.y = (screenRect.y + screenRect.height / 2) / zoom - rect.y - rect.height / 2;
  newCam.z = zoom;

  return newCam;
}

function stepZoom(
  camera: Camera,
  out: boolean,
  min: number = MIN_ZOOM,
  max: number = MAX_ZOOM,
  containerRect: Rect
): Camera {
  const step = ZOOM_STEP * 100;
  const zoomValue = Math.round(camera.z * 100);
  // Round to the nearest step value
  let roundedZoomValue = out ? Math.floor(zoomValue / step) * step : Math.ceil(zoomValue / step) * step;
  const deltaZoomValue = Math.abs(roundedZoomValue - zoomValue);
  // If it matches the start value, bump
  if (!deltaZoomValue) {
    if (out) {
      roundedZoomValue -= step;
    } else {
      roundedZoomValue += step;
    }
  }

  const nextZoom = Math.min(max, Math.max(min, roundedZoomValue / 100));
  const center = { x: containerRect.x + containerRect.width / 2, y: containerRect.y + containerRect.height / 2 };

  return zoomCamera(camera, center, camera.z - nextZoom);
}

export function zoomIn(containerRect: Rect, camera: Camera, max: number = MAX_ZOOM): Camera {
  return stepZoom(camera, false, MIN_ZOOM, max, containerRect);
}

export function zoomOut(containerRect: Rect, camera: Camera, min: number = MIN_ZOOM): Camera {
  return stepZoom(camera, true, min, MAX_ZOOM, containerRect);
}

export function zoomReset(containerRect: Rect, camera: Camera, nextZoom: number): Camera {
  const center = { x: containerRect.x + containerRect.width / 2, y: containerRect.y + containerRect.height / 2 };
  return zoomCamera(camera, center, camera.z - nextZoom);
}

export function rectFromPoints(start: Point, end: Point): Rect {
  const height = Math.abs(start.y - end.y);
  const width = Math.abs(start.x - end.x);
  const topToBottom = start.y < end.y;
  const leftToRight = start.x < end.x;
  const y = topToBottom ? start.y : end.y;
  const x = leftToRight ? start.x : end.x;
  return {
    y: Math.round(y),
    x: Math.round(x),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function getExpandedRects(a: Rect, b: Rect): Rect {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  const width = Math.abs(maxX - minX);
  const height = Math.abs(maxY - minY);

  return { x: minX, y: minY, width, height };
}

export function getCommonRect(bounds: Rect[]): Rect {
  if (bounds.length < 2) return bounds[0];

  let result = bounds[0];

  for (let i = 1; i < bounds.length; i++) {
    result = getExpandedRects(result, bounds[i]);
  }

  return result;
}

export function isPointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function isScreenPointInRect(screenPoint: Point, rect: Rect, camera: Camera): boolean {
  const point = screenToCanvas(screenPoint, camera);
  return isPointInRect(point, rect);
}

export function getRectCenterPoint(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function getCenterAlignedRect(viewport: Rect, rect: Rect): Rect {
  const centerPoint = getRectCenterPoint(viewport);
  return {
    x: centerPoint.x - rect.width / 2,
    y: centerPoint.y - rect.height / 2,
    width: rect.width,
    height: rect.height,
  };
}

export function getInsetRect(rect: Rect, by: number): Rect {
  return {
    x: rect.x + by,
    y: rect.y + by,
    width: rect.width - by * 2,
    height: rect.height - by * 2,
  };
}
