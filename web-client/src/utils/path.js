export const buildEditorBasePath = ({ documentId, layout }) => {
  return `/${layout}/${documentId}`;
};

export const buildExpandedCardUrl = ({ basePath, artifactId, sentence, page }) => {
  let url = `${basePath}?artifact=${artifactId}&text=${sentence || ""}`;
  if (page !== undefined) {
    url = `${url}&page=${page}`;
  }
  return url;
};

export const buildExpandedStackUrl = ({ basePath, artifactId, sentence, stackId, page }) => {
  let url = `${basePath}?artifact=${artifactId}&text=${sentence || ""}&stack=${stackId}`;
  if (page !== undefined) {
    url = `${url}&page=${page}`;
  }
  return url;
};
