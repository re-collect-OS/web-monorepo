import React, { useRef, useCallback, useImperativeHandle, useMemo, useEffect, useState } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import { createEditor, Transforms, Editor, Node, Element as SlateElement, Range, Text } from "slate";
import { Slate, Editable, ReactEditor, withReact, useSelected } from "slate-react";
import { withHistory } from "slate-history";
import { isUrl } from "js-shared-lib";

import { useEffectOnce } from "../../libs/hooksLib";
import { findStrMatchRange } from "../../libs/documentLib";

import {
  wrapLink,
  unwrapLink,
  isLinkActive,
  insertLink,
  toggleMark,
  isMarkActive,
  handleIndent,
  handleUnindent,
  isTextType,
  isListType,
  isListItemType,
  isElementActive,
} from "../../libs/editorLib";

import HoveringToolbar from "./HoveringToolbar";
import LinkToolbar from "./LinkToolbar";

import styles from "./RTE.module.css";

const SHORTCUTS = {
  "*": "list-item",
  "-": "list-item",
  "1.": "ordered-list-item",
};

const Leaf = ({ attributes, children, leaf, onHighlightClick }) => {
  return (
    <span
      {...attributes}
      className={cn({ [styles.isHighlighted]: !!leaf.highlightCardId })}
      style={{
        fontWeight: leaf.bold ? "600" : undefined,
        fontStyle: leaf.italic ? "italic" : undefined,
        // The following is a workaround for a Chromium bug where,
        // if you have an inline at the end of a block,
        // clicking the end of a block puts the cursor inside the inline
        // instead of inside the final {text: ''} node
        // https://github.com/ianstormtaylor/slate/issues/4704#issuecomment-1006696364
        paddingLeft: leaf.text === "" ? 0.1 : undefined,
      }}
      {...(onHighlightClick && !!leaf.highlightCardId
        ? { onClick: onHighlightClick.bind(null, leaf.highlightCardId) }
        : {})}
    >
      {children}
    </span>
  );
};

Leaf.propTypes = {
  attributes: PropTypes.object.isRequired,
  children: PropTypes.element.isRequired,
  leaf: PropTypes.object.isRequired,
  onHighlightClick: PropTypes.func,
};

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
const InlineChromiumBugfix = () => (
  <span contentEditable={false} style={{ fontSize: 0 }}>
    ${String.fromCodePoint(160) /* Non-breaking space */}
  </span>
);

const LinkComponent = ({ attributes, children, element }) => {
  const selected = useSelected();
  return (
    <a
      {...attributes}
      target={"_blank"}
      rel={"noreferrer"}
      href={element.url}
      style={selected ? { boxShadow: "0 0 0 2px #D0CFED" } : undefined}
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </a>
  );
};

LinkComponent.propTypes = {
  attributes: PropTypes.object.isRequired,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  element: PropTypes.object.isRequired,
};

const Element = (props) => {
  const { attributes, children, element } = props;
  switch (element.type) {
    case "title":
      return <h1 {...attributes}>{children}</h1>;
    case "paragraph":
      return <p {...attributes}>{children}</p>;
    case "link":
      return <LinkComponent {...props} />;
    case "list":
      return <ul {...attributes}>{children}</ul>;
    case "ordered-list":
      return <ol {...attributes}>{children}</ol>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    default:
      console.error("RTE: unhandled element type ", element.type);
      return <p {...attributes}>{children}</p>;
  }
};

Element.propTypes = {
  attributes: PropTypes.object.isRequired,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  element: PropTypes.object.isRequired,
};

const withShortcuts = (editor) => {
  const { insertText } = editor;

  editor.insertText = (text) => {
    const { selection } = editor;

    let handled = false;

    if (text.endsWith(" ") && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, { match: (n) => Editor.isBlock(editor, n) });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range) + text.slice(0, -1);
      const type = SHORTCUTS[beforeText];

      if (type) {
        Transforms.select(editor, range);

        if (!Range.isCollapsed(range)) {
          Transforms.delete(editor);
        }

        handleIndent(editor, type === "ordered-list-item");
        // Skip default insert text behavior
        handled = true;
      }
    }

    if (!handled) {
      insertText(text);
    }
  };

  return editor;
};

const withListNormalization = (editor) => {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    // Paragraphs, titles, and list items in list items should be stripped out
    if (SlateElement.isElement(node) && isListItemType(node.type)) {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (SlateElement.isElement(child) && (isTextType(child.type) || isListItemType(child.type))) {
          Transforms.unwrapNodes(editor, { at: childPath });
          return;
        }
      }
    }

    // Convert paragraphs and titles to list items if they are the children of a list
    if (SlateElement.isElement(node) && isListType(node.type)) {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (SlateElement.isElement(child) && isTextType(child.type)) {
          Transforms.setNodes(editor, { type: "list-item" }, { at: childPath });
          return;
        }
      }
    }

    // Limit list depth to 5 (ala Figma)
    if (SlateElement.isElement(node) && isListType(node.type)) {
      if (path.length > 5) {
        Transforms.unwrapNodes(editor, { at: path });
        return;
      }
    }

    // Merge sequential lists
    if (SlateElement.isElement(node) && isListType(node.type)) {
      const [previousNode] = Editor.previous(editor, { at: path }) ?? [];
      if (previousNode && SlateElement.isElement(previousNode) && isListType(previousNode.type)) {
        Transforms.mergeNodes(editor, { at: path });
        return;
      }

      const [nextNode, nextNodePath] = Editor.next(editor, { at: path }) ?? [];
      if (nextNode && SlateElement.isElement(nextNode) && isListType(nextNode.type)) {
        Transforms.mergeNodes(editor, { at: nextNodePath });
        return;
      }
    }

    // Flatten empty lists
    if (SlateElement.isElement(node) && isListType(node.type)) {
      const [parentNode] = Editor.parent(editor, path);
      // If parent is an empty list, unwrap it
      if (SlateElement.isElement(parentNode) && isListType(parentNode.type) && parentNode.children.length <= 1) {
        Transforms.unwrapNodes(editor, { at: path });
        return;
      }
    }

    normalizeNode(entry);
  };

  return editor;
};

export const withLayout = (editor) => {
  const { normalizeNode } = editor;

  editor.normalizeNode = ([node, path]) => {
    if (path.length === 0) {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (SlateElement.isElement(child)) {
          if (childPath[0] === 0 && child.type !== "title") {
            // Make first child a title always
            Transforms.setNodes(editor, { type: "title" }, { at: childPath });
          } else if (childPath[0] > 0 && child.type === "title") {
            // Make sure only first child is a title
            Transforms.setNodes(editor, { type: "paragraph" }, { at: childPath });
          }
        }
      }
    }

    return normalizeNode([node, path]);
  };

  return editor;
};

const withInlines = (editor) => {
  const { insertData, insertText, isInline, normalizeNode } = editor;

  editor.isInline = (element) => ["link"].includes(element.type) || isInline(element);

  editor.insertText = (text) => {
    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertText(text);
    }
  };

  editor.insertData = (data) => {
    const text = data.getData("text/plain");

    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertData(data);
    }
  };

  editor.normalizeNode = ([node, path]) => {
    // Remove link nodes whose text value is empty string.
    // Empty text links happen when you move from link to next line or delete link line.
    if (SlateElement.isElement(node) && node.type === "paragraph") {
      const children = Array.from(Node.children(editor, path));
      for (const [child, childPath] of children) {
        if (SlateElement.isElement(child) && child.type === "link" && child.children[0].text === "") {
          if (children.length === 1) {
            Transforms.removeNodes(editor, { at: path });
            Transforms.insertNodes(editor, {
              type: "paragraph",
              children: [{ text: "" }],
            });
          } else {
            Transforms.removeNodes(editor, { at: childPath });
          }
          return;
        }
      }
    }

    return normalizeNode([node, path]);
  };

  return editor;
};

export const withLayoutNoTitle = (editor) => {
  const { normalizeNode } = editor;

  editor.normalizeNode = ([node, path]) => {
    if (path.length === 0) {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (SlateElement.isElement(child)) {
          if (childPath[0] === 0 && isListItemType(child.type)) {
            // Make sure first child is not a lone list-item (not sure why this happens tbh)
            Transforms.setNodes(editor, { type: "paragraph" }, { at: childPath });
            return;
          }
        }
      }
    }

    // Convert pasted titles into bold paragraphs
    if (SlateElement.isElement(node) && node.type === "title") {
      Transforms.setNodes(editor, { type: "paragraph" }, { at: path });
      for (const [child, childPath] of Node.children(editor, path)) {
        if (!child.bold) {
          Transforms.setNodes(editor, { bold: true }, { at: childPath });
        }
      }
      return;
    }

    return normalizeNode([node, path]);
  };

  return editor;
};

const RTE = React.forwardRef(
  (
    {
      autoFocus = false,
      className,
      onBlur,
      onFocus,
      onGenerate,
      placeholder,
      readOnly = false,
      setValue,
      value,
      withLayout = withLayoutNoTitle,
      highlights,
      onHighlightClick,
      onAltEnterKeyDown,
    },
    ref
  ) => {
    // https://github.com/ianstormtaylor/slate/issues/4081
    const [editor] = useState(() =>
      withLayout(withListNormalization(withShortcuts(withInlines(withHistory(withReact(createEditor()))))))
    );

    // Capture root DOM node
    // Smell: counting on this to re-render on mount
    const [rootEl, setRootEl] = useState();
    const wrapperRef = useRef();

    const [matchRanges, setMatchRanges] = useState([]);

    useEffect(() => {}, [value]);

    useEffect(() => {
      if (!highlights?.length) return;

      const ranges = highlights.map((highlight) => findStrMatchRange(editor, highlight.text));

      if (ranges.length) {
        setMatchRanges(ranges);
      }
    }, [editor, highlights]);

    const decorate = useCallback(
      ([node, path]) => {
        if (Text.isText(node) && matchRanges.length) {
          const highlightIntersections = [];
          matchRanges.forEach((range, index) => {
            if (range) {
              const intersection = Range.intersection(range, Editor.range(editor, path));
              if (intersection) {
                const highlight = highlights[index];
                highlightIntersections.push({
                  ...(highlight ? { highlightCardId: highlight.cardId } : {}),
                  ...intersection,
                });
              }
            }
          });
          return highlightIntersections;
        }

        return [];
      },
      [matchRanges, editor, highlights]
    );

    useEffect(() => {
      try {
        const el = ReactEditor.toDOMNode(editor, editor);
        setRootEl(el);
      } catch (error) {
        console.warn(error);
      }
    }, [editor]);

    // https://github.com/ianstormtaylor/slate/blob/869df75951b5a9f57049ed0008194061c83666ac/packages/slate-react/src/components/editable.tsx#L217
    // Note: Slate is scrolling elements into view with no way to disable the behavior.
    // This is a problem in the playground. We have code to undo the scroll and convert it to a pan (Canvas)
    const selectCursorToEnd = () => Transforms.select(editor, Editor.end(editor, []));
    const deselect = () => {
      if (editor.selection) {
        ReactEditor.deselect(editor);
      }
    };
    useImperativeHandle(ref, () => ({
      focus: (selectEnd) => {
        ReactEditor.focus(editor);
        if (selectEnd) {
          selectCursorToEnd();
        }
      },
      blur: () => {
        ReactEditor.blur(editor);
      },
      deselect,
      hasFocus: () => {
        return ReactEditor.isFocused(editor);
      },
      hasSelection: () => {
        return !!editor.selection;
      },
      reset: (body) => {
        // Slate is an uncontrolled component, if we want to update the value we have to reset it:
        // https://docs.slatejs.org/walkthroughs/06-saving-to-a-database#:~:text=resetNodes%20resets%20the%20value%20of%20the%20editor
        const children = [...editor.children];
        children.forEach((node) => editor.apply({ type: "remove_node", path: [0], node }));
        const bodyNodes = body
          ? body
          : [
              {
                type: "paragraph",
                children: [{ text: "" }],
              },
            ];
        const nodes = Node.isNode(bodyNodes) ? [bodyNodes] : bodyNodes;
        nodes.forEach((node, i) => editor.apply({ type: "insert_node", path: [i], node: node }));

        // Make sure we don't fire a setValue in response to the reset (because presumably this is
        // to get the editor back in sync with the server)
        lastSetValueRef.current = editor.children;
      },
      el: wrapperRef.current,
    }));

    const renderLeaf = useCallback(
      (props) => <Leaf {...props} onHighlightClick={onHighlightClick} />,
      [onHighlightClick]
    );
    const renderElement = useCallback((props) => <Element {...props} />, []);
    const lastSetValueRef = useRef(null);

    useEffectOnce(() => {
      // Move cursor to the last line on mount:
      if (autoFocus) {
        selectCursorToEnd();
      }
    });

    const isBold = useCallback(() => isMarkActive(editor, "bold"), [editor]);
    const doToggleBold = useCallback(() => toggleMark(editor, "bold"), [editor]);

    const isItalic = useCallback(() => isMarkActive(editor, "italic"), [editor]);
    const doToggleItalic = useCallback(() => toggleMark(editor, "italic"), [editor]);

    const isLink = useCallback(() => isLinkActive(editor), [editor]);
    const doToggleLink = useCallback(() => {
      if (isLinkActive(editor)) {
        unwrapLink(editor);
      } else {
        let url = undefined;
        const selectedText = Editor.string(editor, editor.selection);
        if (isUrl(selectedText)) {
          url = selectedText;
        } else {
          url = prompt("Enter a URL");
          if (!url || !isUrl(url)) {
            return;
          }
        }
        insertLink(editor, url);
      }
    }, [editor]);

    const doGenerate = useCallback(() => {
      onGenerate(Editor.string(editor, editor.selection).trim());

      // TODO Strugling with selection sync - possibly needs to happen in as an effect or a bug TBD
      // For now deselecting is better than showing the wrong selection
      ReactEditor.deselect(editor);
    }, [editor, onGenerate]);

    // Really avoid re-rendering the toolbar which is portalled into body
    // Not sure why but otherwise it takes two clicks to trigger. First click just shifts focus.
    const toolbarExpectingInputRef = useRef(false);
    const toolbar = useMemo(() => {
      return (
        <HoveringToolbar
          key={"hovering-toolbar"}
          target={rootEl}
          isBold={isBold}
          isItalic={isItalic}
          isLink={isLink}
          onGenerate={doGenerate}
          doToggleBold={() => {
            doToggleBold();
            ReactEditor.focus(editor);
          }}
          doToggleItalic={() => {
            doToggleItalic();
            ReactEditor.focus(editor);
          }}
          doToggleLink={() => {
            doToggleLink();
            ReactEditor.focus(editor);
          }}
          doMarkExpectedInput={(isExpected) => {
            toolbarExpectingInputRef.current = isExpected;
          }}
        />
      );
    }, [editor, isBold, isItalic, isLink, doToggleItalic, doToggleBold, doToggleLink, doGenerate, rootEl]);

    const linkToolbar = useMemo(() => {
      return (
        <LinkToolbar
          key={"link-toolbar"}
          target={rootEl}
          editor={editor}
          isLink={isLink}
          doRemoveLink={() => {
            if (isLinkActive(editor)) {
              unwrapLink(editor);
            }
          }}
          doMarkExpectedInput={(isExpected) => {
            toolbarExpectingInputRef.current = isExpected;
          }}
        />
      );
    }, [editor, isLink, rootEl]);

    return (
      <div
        ref={wrapperRef}
        onDoubleClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
        }}
      >
        <Slate
          editor={editor}
          value={value}
          onChange={(updatedValue) => {
            if (setValue && lastSetValueRef.current !== updatedValue && value !== updatedValue) {
              lastSetValueRef.current = updatedValue;
              setValue(updatedValue);
            }
          }}
        >
          <Editable
            readOnly={readOnly}
            decorate={decorate}
            className={cn(styles.RTE, className)}
            placeholder={placeholder}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            onKeyDown={(event) => {
              const { selection } = editor;

              // Default left/right behavior is unit:'character'.
              // This fails to distinguish between two cursor positions, such as
              // <inline>foo<cursor/></inline> vs <inline>foo</inline><cursor/>.
              // Here we modify the behavior to unit:'offset'.
              // This lets the user step into and out of the inline without stepping over characters.
              // You may wish to customize this further to only use unit:'offset' in specific cases.
              // https://github.com/ianstormtaylor/slate/blob/main/site/examples/inlines.tsx
              const hasMod = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;
              if (selection && Range.isCollapsed(selection) && !hasMod) {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  Transforms.move(editor, { unit: "offset", reverse: true });
                  return;
                }
                if (event.key === "ArrowRight" && !event.shiftKey) {
                  event.preventDefault();
                  Transforms.move(editor, { unit: "offset" });
                  return;
                }
              }
              // Soft break
              if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault();
                editor.insertText("\n");
                return;
              }
              // Append note card
              if (event.key === "Enter" && event.altKey) {
                if (onAltEnterKeyDown) {
                  event.preventDefault();
                  onAltEnterKeyDown();
                  return;
                }
              }
              if (
                (event.key === "Enter" || event.key === "Backspace") &&
                (isElementActive(editor, "list") || isElementActive(editor, "ordered-list"))
              ) {
                const { selection } = editor;
                const isCollapsed = selection && Range.isCollapsed(selection);
                if (isCollapsed) {
                  // If we're backspacing at the start of the line (first child, 0 offset)
                  if (selection.anchor.path.slice(-1)[0] === 0 && selection.anchor.offset === 0) {
                    event.preventDefault();
                    handleUnindent(editor);
                    return;
                  }
                }
              }
              // Dismiss selection
              if (event.key === "Escape") {
                event.preventDefault();
                ReactEditor.deselect(editor);
                return;
              }
              // Unindent list
              if (event.key === "Tab" && event.shiftKey) {
                event.preventDefault();
                handleUnindent(editor);
                return;
              }
              // Indent list
              if (event.key === "Tab") {
                event.preventDefault();
                handleIndent(editor);
                return;
              }
              // Mod shortcuts
              if (!event.ctrlKey && !event.metaKey) {
                return;
              }
              // Bold
              if (event.key === "b") {
                event.preventDefault();
                doToggleBold();
                return;
              }
              // Italic
              if (event.key === "i") {
                event.preventDefault();
                doToggleItalic();
                return;
              }
              // Link
              if (event.key === "k") {
                event.preventDefault();
                doToggleLink();
                return;
              }
              // Generate
              if (event.key === "Enter" && editor.selection && !Range.isCollapsed(editor.selection)) {
                event.preventDefault();
                doGenerate();
                return;
              }
            }}
            spellCheck
            autoFocus={autoFocus}
            onBlur={() => {
              if (!toolbarExpectingInputRef.current) {
                deselect();
              }

              if (onBlur) {
                onBlur();
              }
            }}
            onFocus={() => {
              if (onFocus) {
                if (!editor.selection) {
                  selectCursorToEnd();
                }

                onFocus();
              }
            }}
          />
          {!readOnly && toolbar}
          {!readOnly && linkToolbar}
        </Slate>
      </div>
    );
  }
);

RTE.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  onGenerate: PropTypes.func,
  placeholder: PropTypes.string,
  readOnly: PropTypes.bool,
  setValue: PropTypes.func,
  value: PropTypes.array.isRequired,
  withLayout: PropTypes.func,
  highlights: PropTypes.arrayOf(PropTypes.object),
  onHighlightClick: PropTypes.func,
  onAltEnterKeyDown: PropTypes.func,
};

export default RTE;
