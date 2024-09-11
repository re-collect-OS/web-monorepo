import { Editor, Text } from "slate";

import { trimStart, trimEnd } from "../utils/trim";

import { isTextType, isListType, isListItemType } from "./editorLib";

export const SCHEMA = 1.6;

function deserializeSlate(children) {
  children?.forEach((node, index) => {
    if ((isTextType(node.type) || isListItemType(node.type)) && node.children?.length === 0) {
      // All Element nodes must contain at least one Text descendant
      // https://github.com/ianstormtaylor/slate/issues/3625
      node.children = [{ text: "" }];
    } else if (isListType(node.type)) {
      if (node.children?.length === 0) {
        // Children array cannot be empty, remove parent node if so
        children.splice(index, 1);
      } else {
        // Remove any list entries that are not nodes
        node.children.forEach((c, i) => {
          if (!c.type) {
            node.children.splice(i, 1);
          }
        });
        if (!node.children.length) {
          // If list doesn't have children, remove list
          children.splice(index, 1);
        } else {
          node.children = deserializeSlate(node.children);
        }
      }
    }
  });
  return children;
}

export const makeDocumentContent = ({
  body,
  cards,
  archivedAt,
  pinnedAt,
  trashedAt,
  camera,
  layout,
  splitLayoutWidth,
}) => ({
  schema: SCHEMA,
  body: deserializeSlate(body),
  cards: cards?.map((c) => ({ ...c, body: deserializeSlate(c.body) })) || [],
  ...(camera ? { camera } : {}),
  ...(layout ? { layout } : {}),
  ...(splitLayoutWidth ? { splitLayoutWidth } : {}),
  ...(archivedAt ? { archivedAt } : {}),
  ...(pinnedAt ? { pinnedAt } : {}),
  ...(trashedAt ? { trashedAt } : {}),
});

export const extractTitle = ({ body }) => {
  return (!!body && body[0]?.children.reduce((acc, c) => `${acc}${c.text}`, "")) || "Untitled";
};

export function migrateDocumentContent(content) {
  if (!content) return makeDocumentContent({ body: [{ type: "title", children: [{ text: "" }] }] });

  if (content.schema !== SCHEMA) {
    // As of 4/29/24 we made sure all cards got migrated to version 1.6 so previous migrations were removed
    // This function was not removed because it's non-obvious how migrations will be handled post the migration
    // to the cards table. Incrementing the schema here and handling the migration should still work but we discussed
    // moving this responsability to the server and migrating everything at source (via Alembic) which seems sane.
    // If it ends up working this way we should clean up this redundant function and drop the schema key from the content.

    // Sample migration
    // if (content.schema === 1.6) {
    //    content.cards?.forEach((card) => { // mutate card here });
    //    content.schema = 1.7;
    // }

    console.warn("Unexpected document schema:", content.schema);
  }

  return makeDocumentContent({ ...content });
}

export function serialize({ body, cards, archivedAt, pinnedAt, trashedAt, camera, layout, splitLayoutWidth }) {
  return JSON.stringify(
    makeDocumentContent({ body, cards, archivedAt, pinnedAt, trashedAt, camera, layout, splitLayoutWidth })
  );
}

export function serializeMarkdown({ body }) {
  const serialize = (node) => {
    if (Text.isText(node)) {
      let string = node.text;
      if (node.bold && node.italic) {
        string = `***${string}***`;
      } else if (node.bold) {
        string = `**${string}**`;
      } else if (node.italic) {
        string = `*${string}*`;
      }
      return string;
    }
    const children = node.children.map((n) => serialize(n)).join("");
    switch (node.type) {
      case "title":
        return children
          .split("\n")
          .map((text) => `# ${text}`)
          .join("\n");
      case "paragraph":
        return `${children}`;
      case "link":
        return `[${children}](${node.url})`;
      case "list-item":
        return `* ${children}\n`;
      default:
        return children;
    }
  };

  return body.map((node) => serialize(node)).join("\n\n");
}

export function serializeText({ body }) {
  const serialize = (node) => {
    if (Text.isText(node)) {
      return node.text;
    }
    const children = node.children.map((n) => serialize(n)).join(" ");
    switch (node.type) {
      case "title":
        return "";
      default:
        return children;
    }
  };
  return body
    .map((node) => serialize(node))
    .join("\n\n")
    .trim();
}

// Selection
// Text selection has a start anchor and an end focus point. To make it simpler to expand
// the selection we normalize it to always be L -> R
export function normalizedSelection(selection) {
  if (!selection) {
    throw new Error("normalizedSelection: expecting a selection");
  }
  const isSameBlock =
    selection.anchor.path.length === selection.focus.path.length &&
    selection.anchor.path[0] === selection.focus.path[0];
  const isSameSegment = isSameBlock && selection.anchor.path[1] === selection.focus.path[1];
  const isFlipped = isSameBlock
    ? isSameSegment
      ? selection.anchor.offset > selection.focus.offset
      : selection.anchor.path[1] > selection.focus.path[1]
    : selection.anchor.path[0] > selection.focus.path[0];
  let start = Object.assign({}, selection.anchor);
  let end = Object.assign({}, selection.focus);
  // Update selection
  return {
    anchor: isFlipped ? end : start,
    focus: isFlipped ? start : end,
  };
}

const separators = [".", "?", "!", "\\n"];
const separatorPattern = new RegExp(`([${separators.join("|")}]{1,})`, "i");
const isSeparator = (str) => str && !!str.match(separatorPattern);

// Expects the output from a split on the sentence separator
// eg: [sentence, separator, sentence, separator etc]
// Return sentence at index including the separator unless the element at index is a separator
function getSentenceAtIndex(sentences, index) {
  if (sentences.length && !isSeparator(sentences[index])) {
    return `${sentences[index]}${sentences[index + 1] || ""}`;
  }
  return "";
}

// Collapse a set of children parts into the full paragraph text and return
// alongside a set of offset lengths so we can later re-create the parts:
function collapsePartsToParagraph(children, path) {
  let length = 0;
  const lengths = [];
  const totalLengths = [];
  const locations = [];

  for (let i = 0; i < children.length; i++) {
    if (Text.isText(children[i])) {
      lengths[i] = children[i].text.length;
    } else {
      // Hacky handling of links - should instead go as deep as needed until we get to a text node
      lengths[i] = children[i].children[0].text.length;
    }
    length += lengths[i];
    totalLengths[i] = length;
    if (path) {
      locations[i] = [...path, i];
    }
  }

  return {
    text: children.reduce((p, c) => `${p}${Text.isText(c) ? c.text : c.children[0].text}`, ""),
    lengths,
    totalLengths,
    ...(path ? { locations } : {}),
  };
}

// Given an offset into the plain text paragraph, return the part index it falls into:
function mapParagraphOffsetToPartIndex({ paragraph, offset }) {
  for (let i = 0; i < paragraph.totalLengths.length; i++) {
    if (offset <= paragraph.totalLengths[i]) {
      return i;
    }
  }
}

// Given a collapsed paragraph and two offsets, map it back to editor selection ranges:
function paragraphOffsetsToRanges({ paragraph, parentPath, startOffset, endOffset }) {
  const startIndex = mapParagraphOffsetToPartIndex({ paragraph, offset: startOffset });
  const endIndex = mapParagraphOffsetToPartIndex({ paragraph, offset: endOffset });

  return {
    anchor: {
      path: [...parentPath, startIndex],
      offset: startOffset - (paragraph.totalLengths[startIndex - 1] || 0),
    },
    focus: {
      path: [...parentPath, endIndex],
      offset: endOffset - (paragraph.totalLengths[endIndex - 1] || 0),
    },
  };
}

// Given an editor selection, it returns a selection that attempts to extend to the full
// sentence or paragraph the selection overlaps.
// 6/8/23 no longer using - leaving in case it provides a useful reference in the future
export function expandedSelection(editor) {
  if (!editor) {
    throw new Error("expandedSelection: expecting an editor instance");
  }
  const selection = normalizedSelection(editor.selection);
  const start = selection.anchor;
  let end = selection.focus;

  const [parent, parentPath] = Editor.above(editor, {
    at: start.path,
    match: (n) => n.type === "title" || n.type === "paragraph" || n.type === "list-item",
  });

  const parts = parent.children;
  const paragraph = collapsePartsToParagraph(parts);

  // Don't support crossing paragraphs, select to the end of the top paragraph:
  // - we might want to disable the button at the UI level
  if (start.path.length !== end.path.length || start.path[0] !== end.path[0]) {
    const lastPartIndex = parts.length - 1;
    end = { path: [...parentPath, start.path[0], lastPartIndex], offset: paragraph.lengths[lastPartIndex] };
  }

  const selectedText = Editor.string(editor, {
    anchor: start,
    focus: end,
  });

  // If selection starts in a space or ends in a separator character, crop:
  if (selectedText.length > 1) {
    const _toTrim = [...separators, " "];
    start.offset += selectedText.length - trimStart(selectedText, _toTrim).length;
    end.offset -= selectedText.length - trimEnd(selectedText, _toTrim).length;
  }

  // Before
  const beforeTextLength =
    paragraph.totalLengths[start.path[start.path.length - 1]] -
    (paragraph.lengths[start.path[start.path.length - 1]] - start.offset);
  const beforeText = paragraph.text.substring(0, beforeTextLength);
  const beforeSentences = beforeText.split(separatorPattern);
  const beforeSentence = getSentenceAtIndex(beforeSentences, beforeSentences.length - 1);
  const startOffsetAdjustment = beforeSentence.length * -1;

  // After
  const afterTextLength =
    paragraph.totalLengths[end.path[end.path.length - 1]] -
    (paragraph.lengths[end.path[end.path.length - 1]] - end.offset);
  const afterText = paragraph.text.substring(afterTextLength);
  const afterSentences = afterText.split(separatorPattern);
  const afterSentence = getSentenceAtIndex(afterSentences, 0);
  const endOffsetAdjustment = afterSentence.length;

  return paragraphOffsetsToRanges({
    paragraph,
    parentPath,
    startOffset: beforeTextLength + startOffsetAdjustment,
    endOffset: afterTextLength + endOffsetAdjustment,
  });
}

// Given a needle string and an editor, return a range representing the matched text in the editor:
// Note expecting sentences that cross paragraph boundaries to be concatenated with no white space
// ex ["end of sentence.", "Start of new sentence"].join("")
// Also note it expands the matched range to the nearest leaf because we're expecting kept (full) sentences.
export const findStrMatchRange = (editor, needle) => {
  if (!Editor.isEditor(editor)) return;

  // Index each pragraph leaf character offsets and location
  let parts = [];
  for (const [node, path] of Editor.nodes(editor, {
    at: [],
    match: (n) => n.type === "paragraph" || n.type === "list-item",
  })) {
    if (["paragraph", "list-item"].includes(node.type)) {
      parts.push(collapsePartsToParagraph(node.children, path));
    }
  }

  // Find our string in the full text
  const text = parts.map((p) => p.text).join("");
  const startOffset = text.indexOf(needle);

  if (startOffset < 0) return;

  const endOffset = startOffset + needle.length;

  // Convert pragraph indexes into something flat we can look up by character offset
  const cumulativeLengths = [];
  const locations = [];
  const partIndexes = [];

  let totalLength = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const prevP = parts[i - 1];
    totalLength += prevP?.totalLengths[prevP.totalLengths.length - 1] || 0;

    for (let j = 0; j < p.locations.length; j++) {
      locations.push(p.locations[j]);
      cumulativeLengths.push(totalLength + p.totalLengths[j]);
      partIndexes.push(i);
    }
  }

  // Do the lookup
  const getIndexForOffset = (offset) => {
    return cumulativeLengths.findIndex((length) => offset <= length);
  };
  const startIndex = getIndexForOffset(startOffset);
  const endIndex = getIndexForOffset(endOffset);
  // Convert the full offsets into part offsets
  const adjustedStartOffset = Math.abs((cumulativeLengths[startIndex - 1] || 0) - startOffset);
  const adjustedEndOffset = Math.abs(endOffset - (cumulativeLengths[endIndex - 1] || 0));

  // Assemble final range
  return {
    anchor: {
      path: locations[startIndex],
      offset: adjustedStartOffset,
    },
    focus: {
      path: locations[endIndex],
      offset: adjustedEndOffset,
    },
  };
};
