// TEMP

export function textToSlateBody(str) {
  return [{ type: "paragraph", children: [{ text: str || "" }] }];
}

function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}

function isText(value) {
  return isPlainObject(value) && typeof value.text === "string";
}

function serializeText({ body }) {
  const serialize = (node) => {
    if (isText(node)) {
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

  return body.map((node) => serialize(node)).join("\n");
}

export function textFromSlateBody(nodes) {
  if (!nodes || !nodes.length) {
    return "";
  }
  return serializeText({ body: nodes });
}
