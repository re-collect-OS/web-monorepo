// Utils to inject highlight in a range while preserving page structure

export function isValidContentNode(node) {
  // No go list for element types that can't contain valid text content
  return ![
    HTMLScriptElement,
    HTMLStyleElement,
    HTMLSelectElement,
    // HTMLTableElement,
    // HTMLTableRowElement,
    // HTMLTableColElement,
    // HTMLTableSectionElement,
    HTMLInputElement,
    HTMLButtonElement,
  ].some((t) => node instanceof t);
}

export function doHighlightRange(range, factory) {
  if (range.collapsed) {
    return;
  }

  let start = range.startContainer;
  let end = range.endContainer;
  const common = range.commonAncestorContainer;
  let cursorIsValid = true;

  // Normalize the selection
  // Attempt to move the selection into the appropriate text nodes

  // A note on offsets:
  // If the parent node of Range is a Node of type Text then the offset index will be the index of ending character of the Range.
  // For other Node types, the endOffset is the index of child nodes at the ending of the parent node.

  if (range.endOffset === 0) {
    // If we're at the start of the end container, set the previous element as the end
    while (!end.previousSibling && end.parentNode !== common) {
      end = end.parentNode;
    }
    end = end.previousSibling;
  } else {
    if (end.nodeType === Node.TEXT_NODE) {
      // If we have a partial selection of a text node
      if (range.endOffset < end.nodeValue.length) {
        // Break the text node into two
        end.splitText(range.endOffset);
      }
    } else {
      // Otherwise move the end to the text node
      end = end.childNodes.item(range.endOffset);
    }
  }

  if (start.nodeType === Node.TEXT_NODE) {
    if (range.startOffset === start.nodeValue.length) {
      // If we're at the very end of the start text node, invalidate cursor
      cursorIsValid = false;
    } else {
      if (range.startOffset > 0) {
        // Otherwise, break the text node into two if we are not at the very beginning
        const endNeedsMove = end === start;
        // Note: splitText returns the newly created Text node that contains the text after the specified offset point.
        start = start.splitText(range.startOffset);
        // Move the end pointer to the new text node if necessary
        if (endNeedsMove) {
          end = start;
        }
      }
    }
  } else {
    // Otherwise move the end to the text node
    start = start.childNodes.item(range.startOffset);
  }

  let done = false;
  let cursor = start;

  do {
    // We've reached a valid text node, wrap it:
    if (cursorIsValid && cursor.nodeType === Node.TEXT_NODE && isValidContentNode(cursor.parentNode)) {
      let node = factory(cursor);
      cursor.parentNode.insertBefore(node, cursor);
      // Wrap the start node and move the cursor to the last child (invalidated since we know we're at the end)
      node.appendChild(cursor);
      cursor = node.lastChild;
      cursorIsValid = false;
    }

    // Stop iterating when we've converged on one node and it's not a valid container
    if (cursor === end && !(cursor.hasChildNodes() && cursorIsValid)) {
      done = true;
    }

    // Invalidate cursor if parent is not a valid container
    if (!isValidContentNode(cursor.parentNode)) {
      cursorIsValid = false;
    }

    // Iterate throught the DOM
    if (cursorIsValid && cursor.hasChildNodes()) {
      cursor = cursor.firstChild;
    } else if (cursor.nextSibling) {
      cursor = cursor.nextSibling;
      cursorIsValid = true;
    } else {
      cursor = cursor.parentNode;
      cursorIsValid = false;
    }
  } while (!done);
}

export function injectDOMHighlight(range, onClick) {
  if (!range || range.collapsed) return;

  const wrappingNode = document.createElement("span");
  wrappingNode.style.backgroundColor = "rgba(244, 221, 115, 0.45)";
  wrappingNode.style.cursor = "pointer";
  wrappingNode.dataset.recollectType = "highlight";

  // Keep a list of the spans we create
  const spans = [];
  doHighlightRange(range, () => {
    const node = wrappingNode.cloneNode(false);
    if (onClick) {
      node.addEventListener("click", onClick);
    }
    spans.push(node);
    return node;
  });

  return spans;
}

export function destroyDOMHighlight(el) {
  const parent = el.parentNode;
  el.replaceWith(...el.childNodes);
  parent.normalize();
}
