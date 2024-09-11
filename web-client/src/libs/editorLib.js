import { Transforms, Editor, Element as SlateElement, Range, Node } from "slate";

// Text Marks

export const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? !!marks[format] : false;
};

export const toggleMark = (editor, format, value = true) => {
  if (isMarkActive(editor, format)) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, value);
  }
};

// List

export const isElementActive = (editor, format, path) => {
  const [match] = Editor.nodes(editor, {
    ...(path ? { at: path } : {}),
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });

  return !!match;
};

export const isTextType = (type) => type === "title" || type === "paragraph";
export const isListType = (type) => type === "list" || type === "ordered-list";
export const isListItemType = (type) => type === "list-item";

export const toggleElement = (
  editor,
  format, // target type
  path
) => {
  const pathRef = path ? Editor.pathRef(editor, path) : null;
  const isActive = isElementActive(editor, format, path);

  const getCurrentLocation = () => pathRef?.current ?? undefined;

  // If we're switching to a text type element that's not currently active,
  // then we want to fully unwrap the list.
  const continueUnwrappingList = () => {
    // format is text type and is not currently active
    const formatIsTextAndNotActive = !isActive && isTextType(format);

    // there is a list element above the current path/selection
    const hasListTypeAbove = Editor.above(editor, {
      at: getCurrentLocation(),
      match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && isListType(n.type),
    });

    return formatIsTextAndNotActive && hasListTypeAbove;
  };

  do {
    Transforms.unwrapNodes(editor, {
      at: getCurrentLocation(),
      match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && isListType(n.type),
      split: true,
    });
  } while (continueUnwrappingList());

  let newProperties;
  if (isActive) {
    newProperties = { type: "paragraph" };
  } else if (isListType(format)) {
    newProperties = { type: "list-item" };
  } else {
    newProperties = { type: format };
  }

  Transforms.setNodes(editor, newProperties, { at: getCurrentLocation() });

  if (!isActive && isListType(format)) {
    const block = {
      type: format,
      children: [],
    };
    Transforms.wrapNodes(editor, block, { at: getCurrentLocation() });
  }
};

const hasListAbove = (editor) => {
  const { selection } = editor;
  if (!selection) return;

  const ancestors = Node.ancestors(editor, selection.anchor.path);
  let numOfLists = 0;
  for (const [ancestorNode] of ancestors) {
    if (SlateElement.isElement(ancestorNode) && isListType(ancestorNode.type)) {
      numOfLists++;
    }
  }

  return numOfLists > 1;
};

// not using rn
// - we don't want to unwrap all the children of the following lists
// but rather move the lists up a level (when unindenting)
// - when indenting we want to move them to the new wrapper list
// export const getFollowingLists = (editor, at) => {
//   const { selection } = editor;
//   if (!selection) return;

//   const [, listItemPath] = Editor.above(editor, selection);
//   // const node = Node.get(editor, listItemPath);
//   const [currentList, currentListPath] = Editor.parent(editor, listItemPath);
//   const following = currentList.children
//     .slice(Path.relative(listItemPath, currentListPath)[0] + 1)
//     .filter((n) => isListType(n.type));

//   if (at) {
//     Transforms.moveNodes(editor, {
//       at,
//       match: (n) => following.includes(n),
//     });
//   } else {
//     Transforms.liftNodes(editor, {
//       at: currentListPath,
//       match: (n) => following.includes(n),
//     });
//   }
// };

export const handleIndent = (editor, isOrdered) => {
  // We support two list types: ordered and un-ordered
  // In the case where we have a list item already, indent should wrap the list item

  const block = Editor.above(editor, { match: (n) => Editor.isBlock(editor, n) });
  const path = block ? block[1] : [];
  const [parent] = Editor.parent(editor, path);

  const isList = parent?.type === "list";
  const isOrderedList = parent?.type === "ordered-list";

  if (isList || isOrderedList) {
    let type;
    if (isOrdered !== undefined) {
      type = isOrdered ? "ordered-list" : "list";
    } else {
      type = isList ? "list" : "ordered-list";
    }
    Transforms.wrapNodes(editor, { type, children: [] });
  } else if (isElementActive(editor, "paragraph")) {
    // Convert paragraph to a list - we rely on the isOrdered flag to know what
    // kind of list to convert it to (defaults to ul):
    Transforms.wrapNodes(editor, {
      type: isOrdered ? "ordered-list" : "list",
      children: [],
    });
  }
};

export const handleUnindent = (editor) => {
  const { selection } = editor;
  if (!selection) return;

  // Only unindent if there would be another list above the current node
  if (hasListAbove(editor)) {
    Transforms.unwrapNodes(editor, {
      match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && isListType(n.type),
      split: true,
    });
  } else {
    // Convert to paragraph
    toggleElement(editor, "paragraph");
  }
};

// Link

export const isLinkActive = (editor) => {
  const [link] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
  });
  return !!link && link[0].url;
};

export const wrapLink = (editor, url) => {
  if (!url) return;

  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;

  const isCollapsed = selection && Range.isCollapsed(selection);
  const link = {
    type: "link",
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link, { select: true });
    // Select the start of the next node to escape the inside of the link:
    const [nextNode, nextNodePath] = Editor.next(editor) ?? [];
    if (nextNode) {
      Transforms.select(editor, {
        anchor: { path: nextNodePath, offset: 0 },
        focus: { path: nextNodePath, offset: 0 },
      });
    }
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
  }
};

export const unwrapLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "link",
  });
};

export const insertLink = (editor, url) => {
  if (editor.selection) {
    wrapLink(editor, url);
  }
};
