import { getCommonRect, debounce, isPointInRect } from "js-shared-lib";

// TODO extract

function overlaps(a, b) {
  // no horizontal overlap
  if (a.x1 >= b.x2 || b.x1 >= a.x2) return false;
  // no vertical overlap
  if (a.y1 >= b.y2 || b.y1 >= a.y2) return false;
  return true;
}
const rectToPoints = (rect) => ({ x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height });

const doRectanglesOverlap = (r1, r2) => {
  return overlaps(rectToPoints(r1), rectToPoints(r2));
};

// const getNearestMultiple = (number, multiple) => {
//   return number + (multiple - (number % multiple));
// };

// https://github.com/vasturiano/d3-morton-order
// The maximum safe order is 26 (visualization: https://bl.ocks.org/vasturiano/db5e9e9cfe77d8c468136dc781ba0cc8)
// I'm flipping the order so passing in x for y, y for x and canvas height for width
function zOrder(x, y, xOffset, yOffset, canvasWidth = 1, order = 6) {
  var n = Math.pow(2, order),
    xy = [x + xOffset * -1, y + yOffset * -1].map(function (coord) {
      return Math.floor((coord * n) / canvasWidth);
    });
  const a = interleave(xy[0], xy[1]);
  return a;
}

// http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
function interleave(x, y) {
  var B = [0x55555555, 0x33333333, 0x0f0f0f0f, 0x00ff00ff];
  var S = [1, 2, 4, 8];

  x = (x | (x << S[3])) & B[3];
  x = (x | (x << S[2])) & B[2];
  x = (x | (x << S[1])) & B[1];
  x = (x | (x << S[0])) & B[0];

  y = (y | (y << S[3])) & B[3];
  y = (y | (y << S[2])) & B[2];
  y = (y | (y << S[1])) & B[1];
  y = (y | (y << S[0])) & B[0];

  return x | (y << 1);
}

export default class SpatialIndex {
  constructor({ gridSize = 8, onStackIndexUpdate }) {
    this.gridSize = gridSize;
    this.onStackIndexUpdate = onStackIndexUpdate;

    this.rectMap = {}; // Mapping of id to rect
    this.stacks = []; // Sets of ids that were identified as being stacked on top of each other
    this.freeCards = []; // Set of ids that did not make it into a stack
    this.rectIdToStackIndexMap = {}; // Mapping of id to stack index for efficient lookup

    // Because the cards self-report size on mount we must avoid rapid fire re-calculation with a minimal debounce:
    this.debouncedIndexStacks = debounce(this._indexStacks.bind(this), { delay: 0 });
    this.globalRect = { x: 0, y: 0, width: 0, height: 0 };
    this._cachedSortedIds = null;
  }

  getSortedIds() {
    if (this._cachedSortedIds) {
      return this._cachedSortedIds;
    }

    // Get a linear list of ids in spatial order defined by:
    // - top level free structures (stacks + free cards) are sorted top bottom, left right
    // - within a stack cards are sorted top down
    const sortedIds = [];

    // Index all top level structures (stacks + free cards) and their rect
    const topLevelObject = [];
    this.stacks.forEach((stackedIds, index) => {
      const rect = this.getCommonRect(stackedIds);
      topLevelObject.push({ stackIndex: index, rect });
    });
    this.freeCards.forEach((id) => {
      const rect = this.getRect(id);
      topLevelObject.push({ id, rect: rect });
    });

    // Sort the stacks and free cards
    topLevelObject
      .sort(
        (a, b) =>
          zOrder(a.rect.y, a.rect.x, this.globalRect.y, this.globalRect.x, this.globalRect.height) -
          zOrder(b.rect.y, b.rect.x, this.globalRect.y, this.globalRect.x, this.globalRect.height)
      )
      .forEach((obj) => {
        if (obj.id !== undefined) {
          sortedIds.push(obj.id);
        } else if (obj.stackIndex !== undefined) {
          // Because of how we index the stacks, we assume these ids are already sorted top down, left right
          const stackedIds = this.stacks[obj.stackIndex];
          sortedIds.push(...stackedIds);
        }
      });

    // Cache
    this._cachedSortedIds = sortedIds;

    return sortedIds;
  }

  // TODO need the concept of a batch of changes to avoid thrashing the stacks
  // apply(set: [], remove: [], shouldDebounce)
  // or .startRecordingChanges() .commitRecordedChanges()

  set(id, rect, shouldDebounce) {
    // Merge to allow for partial updates
    this.rectMap[id] = { ...(this.rectMap[id] || {}), ...rect };
    if (shouldDebounce) {
      this.debouncedIndexStacks();
    } else {
      this._indexStacks();
    }
  }

  remove(id, shouldDebounce) {
    if (this.rectMap[id]) {
      delete this.rectMap[id];
      if (shouldDebounce) {
        this.debouncedIndexStacks();
      } else {
        this._indexStacks();
      }
    }
  }

  intersect(selectionRect) {
    const matches = [];
    for (let id in this.rectMap) {
      const cardRect = this.rectMap[id];
      if (doRectanglesOverlap(cardRect, selectionRect)) {
        matches.push(id);
      }
    }
    return matches;
  }

  getRect(id) {
    return this.rectMap[id];
  }

  getPoint(id) {
    const rect = this.getRect(id);
    if (rect) {
      return { x: rect.x, y: rect.y };
    }
  }

  getCommonRect(ids) {
    const rects = ids.map((id) => this.getRect(id)).filter(Boolean);
    return getCommonRect(rects);
  }

  _getGlobalRect() {
    const ids = Object.keys(this.rectMap);
    return this.getCommonRect(ids);
  }

  _findStackedBelowRect(id, yOffset = 0) {
    // A stack is defined as a card exactly { griSize } px offset from the rect above it

    const startRect = this.rectMap[id];
    if (!startRect) return;

    for (let _id in this.rectMap) {
      if (_id === id) continue;

      const rect = this.rectMap[_id];
      if (rect.x === startRect.x && rect.y === startRect.y + startRect.height + (this.gridSize || 0) - yOffset) {
        return _id;
      }
    }
  }

  _indexStacks() {
    const { stacks, rectIdToStackIndexMap, freeCards } = this._identifyStacks();
    this.stacks = stacks;
    this.freeCards = freeCards;
    this.globalRect = this._getGlobalRect(); // TODO do as part of _identifyStacks job to avoid looping over everythign again?
    this.rectIdToStackIndexMap = rectIdToStackIndexMap;
    // Invalidate sortedIds cache
    if (this._cachedSortedIds) {
      this._cachedSortedIds = null;
    }
    // Send update
    if (this.onStackIndexUpdate) {
      this.onStackIndexUpdate({ stacks, rectIdToStackIndexMap, freeCards });
    }
  }

  _identifyStacks() {
    // Stacks are top down
    // If we want to index all the stacks on the board we need to first sort all rects by the y coordinate
    // TODO use b-tree insted of an array
    const ySortedRects = [];
    for (const id in this.rectMap) {
      if (Object.prototype.hasOwnProperty.call(this.rectMap, id)) {
        ySortedRects.push({ ...this.rectMap[id], id });
      }
    }

    const ySortedIds = ySortedRects.sort((a, b) => a.y - b.y).map((rect) => rect.id);

    const stacks = []; // Sets of rect IDs that fit the definition of a stack
    const freeCards = []; // Set of IDs that are not part of a stack
    const rectIdToStackIndexMap = {}; // Keep an index of rect ID to
    // Starting from the top, traverse until we've evaluated every card
    while (ySortedIds.length > 0) {
      const head = ySortedIds[0];
      const rectsBelow = this.getStackedRects(head, 0);
      if (rectsBelow.length) {
        // When we find a stack, keep track of it
        const newStack = [head, ...rectsBelow.map((rect) => rect.id)];
        const stackIndex = stacks.length;
        // Filter out all the identified stack members
        newStack.forEach((id) => {
          ySortedIds.splice(ySortedIds.indexOf(id), 1);
          rectIdToStackIndexMap[id] = stackIndex;
        });
        stacks.push(newStack);
      } else {
        // Remove just the head
        ySortedIds.shift();
        freeCards.push(head);
      }
    }

    return { stacks, rectIdToStackIndexMap, freeCards };
  }

  getStackedRects(id, yOffset = 0) {
    // yOffset is needed because we need to undo the height change to avoid having to
    // calculate this chain on every mutation. Ideally these stacks would get computed lazily
    // and this would be a simple lookup. At that point we should get rid of the yOffset hack.
    const parentRect = this.rectMap[id];
    if (!parentRect) return;

    let cursor = id;
    const matches = [];
    while (cursor) {
      cursor = this._findStackedBelowRect(cursor, cursor === id ? yOffset : 0);
      const cardRect = this.rectMap[cursor];
      if (cursor) {
        matches.push({ ...cardRect, id: cursor });
      }
    }

    return matches;
  }

  arePointsClose(point, targetPoint, tolerance) {
    if (Math.abs(point.x - targetPoint.x) < tolerance && Math.abs(point.y - targetPoint.y) < tolerance) {
      return true;
    }
    return false;
  }

  // Given a point, if within tolerance of another card, return the point to snap to
  getSnapPoint(point, tolerance = 24) {
    for (let _id in this.rectMap) {
      const cardRect = this.rectMap[_id];
      const targetBottomPoint = { x: cardRect.x, y: cardRect.y + cardRect.height + this.gridSize };
      if (this.arePointsClose(point, targetBottomPoint, tolerance)) {
        // Return the point we want the card to snap to
        return targetBottomPoint;
      }
    }
  }

  // Given:
  // - a set of card ids and a starting position,
  // - return a set of positions so the cards form a stack in the provided order
  getRestackedRectsForIds({ startPoint, ids }) {
    const x = startPoint.x;
    let y = startPoint.y;

    const output = [];
    for (const id of ids) {
      const rect = this.getRect(id);
      output.push({ x, y, width: rect.width, height: rect.height });
      y += rect.height + this.gridSize;
    }
    return output;
  }

  // Given:
  // - a stackRect
  // - a set of stacked rects (unselected cards)
  // - a dragRect to account for overlap (selected cards)
  // - returns the index at which we overlap
  _getStackedRectOverlapIndex({ stackRect, rects, dragRect }) {
    const dragMiddlePoint = { x: dragRect.x + dragRect.width / 2, y: dragRect.y + 20 }; // 20 is half an empty note card height, was (dragRect.height / 2)
    const total = rects.length;
    const offset = this.gridSize / 2;

    for (let index = 0; index < rects.length; index++) {
      const rect = rects[index];
      // Fill the gap between cards for hit testing purposes only
      const logicalRect = { ...rect };
      if (index === 0) {
        logicalRect.height += offset;
      } else if (index === total - 1) {
        logicalRect.y -= offset;
        logicalRect.height += offset;
      } else {
        logicalRect.y -= offset;
        logicalRect.height += offset * 2;
      }
      if (isPointInRect(dragMiddlePoint, logicalRect)) {
        return index;
      }
    }

    // If we made it this far we might be below the rects but still
    // over the original stack
    if (rects.length && isPointInRect(dragMiddlePoint, stackRect)) {
      return rects.length;
    }

    return null;
  }

  // Given:
  // - drag startPoint
  // - drag current point
  // - dragged card ID
  // return a list of cards in the stack, which of them are shifted and by how much
  getStackDragRepositionMap({ point, draggedId, selectedIds }) {
    // also had startPoint
    const stackIndex = this.rectIdToStackIndexMap[draggedId];

    const dragRepositionMap = {};

    // Bail if card is not in a stack - for now
    if (stackIndex === undefined) {
      return dragRepositionMap;
    }

    const stackedIds = this.stacks[stackIndex];
    const unselectedIds = stackedIds.filter((id) => !selectedIds.includes(id));

    const stackRect = this.getCommonRect(stackedIds);

    const selectedRectsRestacked = this.getRestackedRectsForIds({ startPoint: point, ids: selectedIds });
    const unselectedRectsRestacked = this.getRestackedRectsForIds({
      startPoint: { x: stackRect.x, y: stackRect.y },
      ids: unselectedIds,
    });
    const dragRect = getCommonRect(selectedRectsRestacked);
    // TODO figure out how to deal with more than the source stack, need to test nearby stacks in document

    const overlapIndex = this._getStackedRectOverlapIndex({
      stackRect,
      rects: unselectedRectsRestacked,
      dragRect: { ...dragRect, ...point },
    });

    if (overlapIndex !== null) {
      // Recompute stack with the selected cards merged in - expecting the caller will filter them out until drop,
      // at which point they'll be used as the final destination:
      const mergedIds = [...unselectedIds.slice(0, overlapIndex), ...selectedIds, ...unselectedIds.slice(overlapIndex)];
      const finalStackedRects = this.getRestackedRectsForIds({
        startPoint: { x: stackRect.x, y: stackRect.y },
        ids: mergedIds,
      });
      mergedIds.forEach((id, index) => (dragRepositionMap[id] = finalStackedRects[index]));
    } else {
      unselectedIds.forEach((id, index) => (dragRepositionMap[id] = unselectedRectsRestacked[index]));
    }

    return dragRepositionMap;
  }

  // Given:
  // - the top left point
  // - the height of the selected cards (needed for top snapping)
  // - a list of the selected card IDs (needed to filter them out of the stack height calculations)
  // return the closest point to snap to.
  getStackSnapPoint({ point, selRect, selectedIds, stackIndex, tolerance = 24 }) {
    // First test the point I started from if part of a stack
    if (stackIndex !== undefined) {
      const targetStartPoint = { x: selRect.x, y: selRect.y };
      if (this.arePointsClose(point, targetStartPoint, tolerance)) {
        return targetStartPoint;
      }
    }

    // Test each stack first
    for (let i = 0; i < this.stacks.length; i++) {
      // Exclude selected cards from the common stack height calculation
      const ids = this.stacks[i].filter((id) => !selectedIds.includes(id));
      const commonRect = this.getCommonRect(ids);
      if (commonRect) {
        const targetBottomPoint = { x: commonRect.x, y: commonRect.y + commonRect.height + this.gridSize };
        if (this.arePointsClose(point, targetBottomPoint, tolerance)) {
          return targetBottomPoint;
        }
        const targetTopPoint = { x: commonRect.x, y: commonRect.y - selRect.height - this.gridSize };
        if (this.arePointsClose(point, targetTopPoint, tolerance)) {
          return targetTopPoint;
        }
      }
    }

    // Test each free card next
    for (let i = 0; i < this.freeCards.length; i++) {
      // Skip selected cards
      const id = this.freeCards[i];
      if (!selectedIds.includes(id)) {
        const cardRect = this.rectMap[id];
        if (cardRect) {
          const targetBottomPoint = { x: cardRect.x, y: cardRect.y + cardRect.height + this.gridSize };
          if (this.arePointsClose(point, targetBottomPoint, tolerance)) {
            return targetBottomPoint;
          }
          const targetTopPoint = { x: cardRect.x, y: cardRect.y - selRect.height - this.gridSize };
          if (this.arePointsClose(point, targetTopPoint, tolerance)) {
            return targetTopPoint;
          }
        }
      }
    }
  }
}
