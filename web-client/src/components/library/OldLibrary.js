import React, { useEffect, useState, useCallback, useRef } from "react";
import { Menu, MenuItem, MenuTrigger, MenuHorizontalIcon, LoadingIndicator } from "web-shared-lib";
import cn from "classnames";
import { sortHostnamesAlphabetically } from "js-shared-lib";

import PageHeader from "../common/page-header";

import apiLib from "../../libs/apiLib";
const { loadUserCollectedArticles, deleteUserCollectedArticles, retryFailedUserCollectedArticle } = apiLib;
import { DEBUG } from "../../config";

import { forgetUrls, extensionId } from "../../libs/chromeExtensionLib";

import styles from "./OldLibrary.module.css";

function groupByHostname(urlStates) {
  let _hosts = {};

  urlStates
    .sort((a, b) => new Date(b.initial_timestamp).getTime() - new Date(a.initial_timestamp).getTime())
    .forEach((state) => {
      const url = new URL(state.url);
      const hostname = url?.hostname.replace(/^(www\.)/, "");

      // Skip our own note cards unless in debug mode
      if (!DEBUG && hostname === "app.re-collect.ai") {
        return;
      }

      const _state = {
        ...state,
        pathname: hostname === "youtube.com" ? `${url?.pathname}${url?.search}` : url?.pathname,
      };
      if (hostname) {
        if (_hosts[hostname]) {
          _hosts[hostname].push(_state);
        } else {
          _hosts[hostname] = [_state];
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

function renderRows({ model, doSync, doDelete, sort }) {
  const sections = [];
  let keys = Object.keys(model);
  if (sort === "alpha") {
    keys = sortHostnamesAlphabetically(keys);
  }

  keys.forEach((hostname) => {
    const urlStates = model[hostname];
    const rows = urlStates.map(({ status, url, timestamp, pathname, detail }) => {
      const date = new Date(timestamp);
      const isProcessing = [
        "content retrieval required",
        "content retrieval in progress",
        "content retrieval complete",
        "content provided",
        "processing in progress",
      ].includes(status);
      const isProcessed = status === "processing complete";
      const isFailed = ["processing failed", "content retrieval failed"].includes(status);
      const statusStr = isProcessing
        ? "Is processing..."
        : isProcessed
        ? "Ready"
        : isFailed
        ? "Failed to process"
        : "Unknown";
      return (
        <div
          className={styles.row}
          key={`${timestamp}-${url}`}
          title={DEBUG ? `${statusStr} (status: ${status} | detail: ${detail})` : statusStr}
        >
          <div
            className={cn(styles.status, {
              [styles.processing]: isProcessing,
              [styles.processed]: isProcessed,
              [styles.failed]: isFailed,
            })}
          />
          <a href={url} target="_blank" rel="noreferrer" className={styles.url} title={url}>
            {pathname || "/"}
          </a>
          <div className={styles.timestamp} title={date.toLocaleString()}>
            {date.toLocaleDateString("en-US")}
          </div>
          <div className={styles.actions}>
            <MoreButton
              className={styles.moreButton}
              menuContent={
                <Menu align="end">
                  <MenuItem
                    textValue="edit"
                    onSelect={() => {
                      navigator.clipboard.writeText(url).then(
                        () => console.info("Successfully copied URL to clipboard"),
                        () => alert("Failed to write URL to clipboard")
                      );
                    }}
                  >
                    Copy URL
                  </MenuItem>
                  {isFailed && (
                    <MenuItem
                      textValue="retry"
                      onSelect={() => {
                        retryFailedUserCollectedArticle({ url }).then(() => {
                          doSync();
                        });
                      }}
                    >
                      Retry processing
                    </MenuItem>
                  )}
                  <MenuItem
                    variant="destructive"
                    textValue="delete"
                    onSelect={() => {
                      if (confirm(`Are you sure you want to delete article ${url} ?`)) {
                        doDelete([url]);
                      }
                    }}
                  >
                    Delete
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
            <div className={styles.hostname}>{`${hostname}`}</div>
            <div className={styles.count}>{`(${urlStates.length})`}</div>
            <div className={styles.flex} />
            <div className={styles.actions}>
              <MoreButton
                className={styles.moreButton}
                menuContent={
                  <Menu align="end">
                    <MenuItem
                      variant="destructive"
                      textValue="delete"
                      onSelect={() => {
                        if (confirm(`Are you sure you want to delete all articles from ${hostname} ?`)) {
                          const urls = urlStates.map((state) => state.url);
                          doDelete(urls);
                        }
                      }}
                    >
                      Delete all from {hostname}
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

function computeIndexStats(data) {
  const total = data.total;
  const states = new Map();
  data.urlstates.forEach((s) => {
    states.set(s.status, (states.get(s.status) || 0) + 1);
  });

  return {
    total,
    states,
  };
}

function formatIndexStats(stats) {
  if (!stats) return "Loading...";

  const output = [`Total: ${stats.total}`];
  const percentage = (count) => Math.round((count / stats.total) * 100);

  stats.states.forEach((value, key) => {
    output.push(`${key}: ${percentage(value)}%`);
  });
  return output.join(" , ");
}

export default function Library() {
  const dataRef = useRef(null);
  const [model, setModel] = useState({});
  const [indexStats, setIndexStats] = useState(null);
  const [sort, setSort] = useState("date"); // date || alpha

  const doComputeDataModel = useCallback(
    (_data) => {
      setModel(groupByHostname(_data.urlstates.filter((s) => s.status !== "removing")));
      setIndexStats(computeIndexStats(_data));
    },
    [setModel, setIndexStats]
  );

  const doSync = useCallback(() => {
    loadUserCollectedArticles().then((_data) => {
      dataRef.current = _data;
      doComputeDataModel(_data);
    });
  }, [doComputeDataModel]);

  useEffect(() => doSync(), [doSync]);

  const doDelete = useCallback(
    (urls) => {
      // Optimistically remove
      urls.forEach((url) => {
        const index = dataRef.current.urlstates.findIndex((s) => s.url === url);
        if (index >= 0) {
          dataRef.current.urlstates[index].status = "removing";
        }
      });
      doComputeDataModel(dataRef.current);

      deleteUserCollectedArticles({ urls })
        .then(() => {
          forgetUrls({ extensionId, urls });
        })
        .catch((error) => {
          alert(`Failed to remove ${urls.length} urls: ${error.message}`);
          // Force re-sync
          doSync();
        });
    },
    [doComputeDataModel, doSync]
  );

  const rows = renderRows({ model, doSync, doDelete, sort });

  return (
    <div className={styles.Library}>
      <div>
        <div className={styles.headerWrapper}>
          <div className={styles.leftCol}>
            <PageHeader title={"Index"} description={"Debug view"} />
          </div>
          <div className={styles.rightCol}>
            <select
              name="order"
              onChange={(event) => {
                const _sort = event.target.value;
                setSort(_sort);
              }}
              value={sort}
            >
              <option value="date">Sort by creation date</option>
              <option value="alpha">Sort alphabetically</option>
            </select>
          </div>
        </div>
      </div>
      <div className={styles.table}>{rows.length ? rows : <LoadingIndicator />}</div>
      {!!indexStats?.total && (
        <div className={styles.stats}>
          There are{" "}
          <strong title={`${formatIndexStats(indexStats)}`}>
            {indexStats?.states?.get("processing complete") || 0} articles
          </strong>{" "}
          in your index.
        </div>
      )}
    </div>
  );
}
