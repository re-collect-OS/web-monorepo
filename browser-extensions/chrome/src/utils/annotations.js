// Util to map a highlight to a DOM range

const MIN_LEN = 5;
const MAX_LEN = 30;

export class DomAnnotator {
  constructor() {
    this.ignoreElementsRule = new RegExp(
      `(${["audio", "canvas", "figure", "input", "script", "select", "style", "svg", "textarea", "video"].join("|")})`,
      "i"
    );
  }

  // String
  _removeSpaces(str) {
    return str.replace(/\s/g, "");
  }

  _normalise(str) {
    return this._removeSpaces(str).toLowerCase();
  }

  _distance(aStr, bStr) {
    const str1 = aStr.toLowerCase();
    const str2 = bStr.toLowerCase();

    // The Levenshtein distance is a string metric for measuring the difference between two sequences.
    // It is the minimum number of single-character edits required to change one word into the other.
    // https://www.tutorialspoint.com/levenshtein-distance-in-javascript
    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    return track[str2.length][str1.length];
  }

  _similarity(aStr, bStr) {
    const len = Math.max(aStr.length, bStr.length);
    if (!len) return 1;
    return (len - this._distance(aStr, bStr)) / len;
  }

  // Range
  _createRange(startNode, startOffset, endNode, endOffset) {
    // console.log({ startNode, startOffset, endNode, endOffset });
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  // Given a text, find the overlapping needle and return any
  // remainding part of the needle
  _getStartOffset(text, needle, needsLower = false) {
    if (needsLower) {
      text = text.toLowerCase();
      needle = needle.toLowerCase();
    }

    let offset = -1;
    do {
      offset = text.indexOf(needle[0], offset + 1);
      if (offset !== -1) {
        const remaining = this._normalise(text.substr(offset));
        if (needle.substr(0, remaining.length) === remaining) {
          return {
            startOffset: offset,
            remainingSearchString: needle.substr(remaining.length),
          };
        }
        if (remaining.substr(0, needle.length) === needle) {
          return {
            startOffset: offset,
            remainingSearchString: "",
          };
        }
      }
    } while (offset !== -1);

    return false; // TODO convert both offset functions to return objects?
  }

  _getEndOffset(text, needle, needsLower = false) {
    if (needsLower) {
      text = text.toLowerCase();
      needle = needle.toLowerCase();
    }

    let lastNeedleChar = needle[needle.length - 1];
    let offset = -1;

    // Going backwards, scan from the last needle character pos
    // until we find the needle
    do {
      offset = text.indexOf(lastNeedleChar, offset + 1);
      const remaining = this._normalise(text.substr(0, offset + 1));
      if (remaining.indexOf(needle) !== -1) {
        return offset + 1;
      }
    } while (offset !== -1);

    return -1;
  }

  _isTrailing(el, needle) {
    if (!this._isTextNode(el)) return false;

    const start = this._getStartOffset(el.data, needle, true);
    if (start?.remainingSearchString !== "") {
      return start;
    }
  }

  _isLeading(el, needle) {
    const data = el.data;
    const normalizedData = this._normalise(data);
    if (normalizedData.indexOf(needle) === 0) {
      return {
        node: el,
        endOffset: this._getEndOffset(data, needle),
      };
    }

    if (needle.indexOf(normalizedData) !== 0) {
      return null;
    }

    const remainingData = needle.substr(normalizedData.length);
    const next = this._getNextTextNode(el);
    if (next) {
      return this._isLeading(next, remainingData);
    }

    return null;
  }

  _getTextBeforeRange(range, len) {
    len = len || MAX_LEN;
    const _range = range.cloneRange();
    if (_range.startOffset === 0) {
      const previous = this._getPreviousTextNode(range.startContainer);
      if (!previous) {
        return "";
      }
      _range.setStartBefore(previous);
    } else {
      if (!range.startContainer.parentNode) {
        return "";
      }
      _range.setStartBefore(range.startContainer);
    }
    _range.setEnd(range.startContainer, range.startOffset);
    const text = this._normalise(_range.toString());
    if (text.length >= len) {
      return text.substr(text.length - len);
    }
    const delta = len - text.length;
    return this._getTextBeforeRange(_range, delta) + text;
  }

  _getTextAfterRange(range, len) {
    len = len || MAX_LEN;
    const _range = range.cloneRange();
    if (_range.endOffset === _range.endContainer.length) {
      const next = this._getNextTextNode(range.endContainer);
      if (!next) {
        return "";
      }
      _range.setEndAfter(next);
    } else {
      if (!range.endContainer.parentNode) {
        return "";
      }
      _range.setEndAfter(range.endContainer);
    }
    _range.setStart(range.endContainer, range.endOffset);
    const text = this._normalise(_range.toString());
    if (text.length >= len) {
      return text.substr(0, len);
    }
    const delta = len - text.length;
    return text + this._getTextAfterRange(_range, delta);
  }

  _filterRange(ranges, beforeText, afterText) {
    if (ranges.length === 0) return null;
    if (ranges.length === 1) return ranges[0];

    let bestRange = null;
    let bestScore = 0;
    // Foreach candidate range
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      // Extract text before and after
      const before = this._getTextBeforeRange(range, beforeText.length);
      const after = this._getTextAfterRange(range, afterText.length);
      // If we have a perfect match, return
      let score = 1 + this._similarity(before, beforeText) + this._similarity(after, afterText);
      if (score === 3) {
        return range;
      }
      // Otherwise keep track of the best score (higher is better)
      if (bestScore < score) {
        bestScore = score;
        bestRange = range;
      }
    }

    return bestRange;
  }

  _trimStart(range) {
    let _range = range.cloneRange();
    let startNode;
    if (this._isTextNode(_range.startContainer)) {
      if (_range.startOffset + 1 >= _range.startContainer.data.length) {
        startNode = this._getNextTextNode(_range.startContainer);
        if (startNode) {
          _range.setStart(startNode, 0);
        } else {
          _range = null;
        }
      } else {
        _range.setStart(_range.startContainer, _range.startOffset + 1);
      }
    } else {
      const containerNode = _range.startContainer.childNodes[_range.startOffset] || _range.startContainer;
      startNode = this._getFirstTextNode(containerNode);
      if (!startNode) {
        startNode = this._getNextTextNode(containerNode);
      }
      if (startNode) {
        _range.setStart(startNode, 0);
      } else {
        _range = null;
      }
    }

    return this._trimSpaces(range);
  }

  _trimEnd(range) {
    let _range = range.cloneRange();
    if (this._isTextNode(_range.endContainer)) {
      if (_range.endOffset > 0) {
        _range.setEnd(_range.endContainer, _range.endOffset - 1);
      } else {
        const previous = this._getPreviousTextNode(_range.endContainer);
        if (previous) {
          _range.setEnd(previous, previous.data.length);
        } else {
          _range = null;
        }
      }
    } else {
      const containerNode = _range.endContainer.childNodes[_range.endOffset] || _range.endContainer;
      const endNode = this._getPreviousTextNode(containerNode);
      if (endNode) {
        _range.setEnd(endNode, endNode.data.length);
      } else {
        _range = null;
      }
    }

    return this._trimSpaces(range);
  }

  _trimSpaces(range) {
    if (range?.collapsed) {
      return range;
    }
    const _range = range.cloneRange();

    if (!this._isTextNode(_range.startContainer) || _range.startOffset >= _range.startContainer.data.length) {
      return this._trimStart(range);
    }
    // TODO variable name
    const beforeText = _range.startContainer.data[_range.startOffset];
    if (!this._removeSpaces(beforeText).length) {
      return this._trimStart(range);
    }

    if (!this._isTextNode(_range.endContainer) || _range.endOffset === 0) {
      return this._trimEnd(range);
    }
    // TODO variable name
    const afterText = _range.endContainer.data[_range.endOffset - 1];
    if (this._removeSpaces(afterText).length) {
      return _range;
    }
    return this._trimEnd(range);
  }

  // DOM

  _isTextNode(el) {
    return el?.nodeType === 3;
  }

  _getFirstTextNode(el) {
    if (this._isTextNode(el) && this._removeSpaces(el.nodeValue).length > 0) {
      return el;
    }
    if (this._isExpandableNode(el)) {
      var children = el.childNodes;
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        const textNode = this._getFirstTextNode(node);
        if (textNode) {
          return textNode;
        }
      }
    }
    return null;
  }

  _getLastTextNode(el) {
    if (this._isTextNode(el) && this._removeSpaces(el.nodeValue).length > 0) {
      return el;
    }
    if (this._isExpandableNode(el)) {
      var children = el.childNodes;
      for (let i = children.length - 1; i >= 0; i--) {
        const node = children[i];
        const textNode = this._getLastTextNode(node);
        if (textNode) {
          return textNode;
        }
      }
    }
    return null;
  }

  _getPreviousTextNode(el) {
    if (!el) return null;

    let child = el;
    while (child.previousSibling !== null) {
      child = child.previousSibling;
      const last = this._getLastTextNode(child);
      if (last) {
        return last;
      }
    }
    const parent = child.parentNode;
    if (parent) {
      return this._getPreviousTextNode(parent);
    }
    return null;
  }

  _getNextTextNode(el) {
    if (!el) return null;

    let child = el;
    while (child.nextSibling !== null) {
      child = child.nextSibling;
      const next = this._getFirstTextNode(child);
      if (next) return next;
    }

    const next = el.parentNode;
    if (next) {
      return this._getNextTextNode(next);
    }

    return null;
  }

  _isExpandableNode(el) {
    return el?.nodeType === 1 && el.childNodes && !this.ignoreElementsRule.test(el.tagName) && this._isVisible(el);
  }

  _isVisible(el) {
    return (
      !window.getComputedStyle(el) ||
      "" == window.getComputedStyle(el).getPropertyValue("display") ||
      "none" != window.getComputedStyle(el).getPropertyValue("display")
    );
  }

  _search(el, needle) {
    let ranges = [];

    if (this._isTextNode(el)) {
      const text = this._normalise(el.data);
      if (!text.length) {
        return ranges;
      }

      let pos = -1;
      do {
        pos = text.indexOf(needle, pos + 1);
        if (pos >= 0) {
          const { startOffset } = this._getStartOffset(el.data, needle, true); // TODO go back and figure out why data is not normalized first
          const endOffset = this._getEndOffset(el.data, needle);
          const range = this._createRange(el, startOffset, el, endOffset);
          ranges.push(range);
        } else {
          const isTrailing = this._isTrailing(el, needle);
          if (isTrailing) {
            const next = this._getNextTextNode(el);
            if (!next) {
              return ranges;
            }
            const isLeading = this._isLeading(next, isTrailing.remainingSearchString);
            if (isLeading) {
              const range = this._createRange(el, isTrailing.startOffset, isLeading.node, isLeading.endOffset);
              ranges.push(range);
            }
          }
        }
      } while (pos !== -1);

      return ranges;
    }

    if (this._isExpandableNode(el)) {
      const nodes = el.childNodes;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const childRanges = this._search(node, needle);
        ranges = ranges.concat(childRanges);
      }
    }

    return ranges;
  }

  findRange({ text, beforeText = "", afterText = "" }) {
    if (!text || "" === text) {
      throw "Missing search query";
    }

    if (text.length < MIN_LEN) {
      return;
    }

    let needle = this._normalise(text);
    let before = this._normalise(beforeText);
    let after = this._normalise(afterText);

    const el = document.getElementsByTagName("body")[0];
    const ranges = this._search(el, needle);

    if (!ranges.length) {
      return false;
    }
    const range = this._filterRange(ranges, before, after);

    return !range?.collapsed && range;
  }
}
