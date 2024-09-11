import React, { useEffect, useState, useCallback, useRef } from "react";
import cn from "classnames";
import { shallow } from "zustand/shallow";
import { Menu, MenuItem, MenuTrigger, MenuHorizontalIcon, LoadingIndicator } from "web-shared-lib";
import { sortHostnamesAlphabetically } from "js-shared-lib";
import { Link } from "react-router-dom";

import PageHeader from "../common/page-header";

import apiLib from "../../libs/apiLib";
const { deleteUserCollectedArticles } = apiLib;
import { events, analyticsService } from "../../libs/analyticsLib";
import { forgetUrls, extensionId } from "../../libs/chromeExtensionLib";
// import { DEBUG } from "../../config";
import { useStore } from "../../store";

import { IconForArtifact } from "../dashboard/LibraryWidget";

import styles from "./Library.module.css";

function groupByHostname(artifacts) {
  let _hosts = {};

  artifacts
    .sort((a, b) => new Date(b.initial_timestamp).getTime() - new Date(a.initial_timestamp).getTime())
    .forEach((artifact) => {
      const url = new URL(artifact.url);

      let hostname = url?.hostname.replace(/^(www\.)/, "");
      // Rename our internal sparse document hostname to something that makes sense to the customer:
      if (hostname === "app.re-collect.ai" && artifact.doc_subtype === "sparse_document") {
        if (artifact._metadata.readwise_category === "books") {
          hostname = "readwise.io — book highlights";
        } else if (artifact._metadata.readwise_category === "podcasts") {
          hostname = "readwise.io — podcast highlights";
        } else {
          hostname = "readwise.io — article highlights";
        }
      }

      // Rename our internal sparse document hostname to something that makes sense to the customer:
      if (hostname === "app.re-collect.ai" && artifact._metadata?.apple_note_id) {
        hostname = "Apple Notes";
      }

      const _artifact = {
        ...artifact,
        pathname: hostname === "youtube.com" ? `${url?.pathname}${url?.search}` : url?.pathname,
      };
      if (hostname) {
        if (_hosts[hostname]) {
          _hosts[hostname].push(_artifact);
        } else {
          _hosts[hostname] = [_artifact];
        }
      }
    });

  return _hosts;
}

function MoreButton({ className, menuContent, ...props }) {
  return (
    <MenuTrigger
      button={
        <button className={cn(styles.MoreButton, className)} {...props}>
          <MenuHorizontalIcon />
        </button>
      }
      menuContent={menuContent}
    />
  );
}

function renderRows({ model, doDelete, sort }) {
  const sections = [];
  let keys = Object.keys(model);
  if (sort === "alpha") {
    keys = sortHostnamesAlphabetically(keys);
  }

  keys.forEach((hostname) => {
    const artifacts = model[hostname];
    const rows = artifacts.map(({ doc_id, url, initial_timestamp, pathname, title, doc_type, doc_subtype }) => {
      const date = new Date(initial_timestamp);
      return (
        <div className={styles.row} key={doc_id} title={url}>
          <Link to={`/library?artifact=${doc_id}`} className={styles.url} title={`${title} (${url})`}>
            <div className={styles.icon}>
              <IconForArtifact doc_type={doc_type} doc_subtype={doc_subtype} />
            </div>
            <div className={styles.label}>{title || pathname || "/"}</div>
          </Link>
          <div className={styles.timestamp} title={date.toLocaleString()}>
            {date.toLocaleDateString("en-US")}
          </div>
          <div className={styles.actions}>
            <MoreButton
              className={styles.moreButton}
              menuContent={
                <Menu align="end" alignOffset={-8}>
                  <MenuItem
                    textValue="edit"
                    onSelect={() => {
                      navigator.clipboard.writeText(url).then(
                        () => console.info("Successfully copied URL to clipboard"),
                        () => alert("Failed to write URL to clipboard")
                      );
                      analyticsService.logEvent(events.libraryArticlesURLCopied({ source: "action menu" }));
                    }}
                  >
                    Copy URL
                  </MenuItem>
                  <MenuItem
                    variant="destructive"
                    textValue="delete"
                    onSelect={() => {
                      if (confirm(`Are you sure you want to forget ${url} ?`)) {
                        doDelete([url]);
                        analyticsService.logEvent(
                          events.libraryArticlesRemoved({ count: 1, isAll: false, source: "action menu" })
                        );
                      }
                    }}
                  >
                    Forget
                  </MenuItem>
                  <MenuItem
                    variant="destructive"
                    textValue="delete"
                    onSelect={() => {
                      if (confirm(`Are you sure you want to permanently remove ${url} ?`)) {
                        doDelete([url], true);
                        analyticsService.logEvent(
                          events.libraryArticlesRemoved({ count: 1, isAll: false, source: "action menu" })
                        );
                      }
                    }}
                  >
                    Permanently remove
                  </MenuItem>
                </Menu>
              }
            />
          </div>
        </div>
      );
    });

    sections.push(
      <details key={hostname} className={styles.section}>
        <summary className={styles.summaryWrapper}>
          <div className={styles.summary}>
            <div className={styles.hostname}>{hostname}</div>
            <div className={styles.flex} />
            <div className={styles.count}>{artifacts.length}</div>
            <div className={styles.actions}>
              <MoreButton
                className={styles.moreButton}
                menuContent={
                  <Menu align="end" alignOffset={-8}>
                    <MenuItem
                      variant="destructive"
                      textValue="delete"
                      onSelect={() => {
                        if (confirm(`Are you sure you want to forget all articles from ${hostname} ?`)) {
                          const urls = artifacts.map((artifact) => artifact.url);
                          doDelete(urls);
                          analyticsService.logEvent(
                            events.libraryArticlesRemoved({
                              count: artifacts.length,
                              isAll: true,
                              source: "action menu",
                            })
                          );
                        }
                      }}
                    >
                      Forget all from {hostname}
                    </MenuItem>
                  </Menu>
                }
              />
            </div>
          </div>
        </summary>
        <div className={styles.rows}>{rows}</div>
      </details>
    );
  });

  return sections;
}

const selector = (state) => ({
  isLoading: state.artifactsIndex.status === "loading",
  needsLoading: ["preloading", "preloaded"].includes(state.artifactsIndex.status),
  artifacts: state.artifactsIndex.records,
  doArtifactsIndexLoad: state.doArtifactsIndexLoad,
});

export default function Library() {
  const { artifacts, doArtifactsIndexLoad, isLoading, needsLoading } = useStore(selector, shallow);

  const dataRef = useRef([...artifacts]);
  const [model, setModel] = useState(groupByHostname(dataRef.current));
  const [sort, setSort] = useState("date"); // date || alpha

  useEffect(() => {
    dataRef.current = [...artifacts];
    setModel(groupByHostname(dataRef.current));
  }, [artifacts, setModel]);

  const doSync = useCallback(() => {
    doArtifactsIndexLoad();
  }, [doArtifactsIndexLoad]);

  useEffect(() => {
    if (needsLoading) {
      doSync();
    }
  }, [needsLoading, doSync]);

  const doDelete = useCallback(
    (urls, isSoftDelete) => {
      // Optimistically remove
      urls.forEach((url) => {
        const index = dataRef.current.findIndex((s) => s.url === url);
        if (index >= 0) {
          dataRef.current.splice(index, 1);
        }
      });
      setModel(groupByHostname(dataRef.current));

      deleteUserCollectedArticles({ urls, isSoftDelete })
        .then(() => {
          forgetUrls({ extensionId, urls });
        })
        .catch((error) => {
          alert(`Failed to remove ${urls.length} urls: ${error.message}`);
          // Force re-sync
          doSync();
        });
    },
    [setModel, doSync]
  );

  const rows = renderRows({ model, doDelete, sort });

  return (
    <div className={styles.Library}>
      <div>
        <div className={styles.headerWrapper}>
          <div className={styles.leftCol}>
            <PageHeader
              title={"Library"}
              description={
                "An overview of the content in your account, including articles, PDFs, YouTube transcripts, and more from your subscriptions."
              }
            />
          </div>
          <div className={styles.rightCol}>
            <select
              name="order"
              onChange={(event) => {
                const _sort = event.target.value;
                setSort(_sort);
                analyticsService.logEvent(events.libraryArticlesSorted({ sort: _sort, source: "table header" }));
              }}
              value={sort}
            >
              <option value="date">Sort by collection date</option>
              <option value="alpha">Sort alphabetically</option>
            </select>
          </div>
        </div>
      </div>
      <div className={styles.table}>{isLoading ? <LoadingIndicator /> : rows}</div>
      {!isLoading && (
        <div className={styles.stats}>
          There are <strong>{artifacts.length} articles</strong> in your index.
        </div>
      )}
    </div>
  );
}
