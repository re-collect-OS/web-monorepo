import React, { useEffect, useState } from "react";
import cn from "classnames";
import { LoadingIndicator } from "web-shared-lib";
import { sortHostnamesAlphabetically } from "js-shared-lib";
import { shallow } from "zustand/shallow";

import { syncUserData, extensionId } from "../../libs/chromeExtensionLib";
import { useStore } from "../../store";

import styles from "./ManageLists.module.css";

const selector = (state) => ({
  isLoading: state.sync.status !== "success",
  accountSettings: state.user.accountSettings,
  goList: state.userData.goList,
  noGoList: state.userData.noGoList,
  doUserDataUpdate: state.doUserDataUpdate,
});

export default function ManageLists() {
  const { isLoading, accountSettings, goList, noGoList, doUserDataUpdate } = useStore(selector, shallow);
  const isOptOut = accountSettings?.is_opt_out;
  const setGoList = (list) => doUserDataUpdate({ goList: list });
  const setNoGoList = (list) => doUserDataUpdate({ noGoList: list });

  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [needsSave, setNeedsSave] = useState(false);
  const [toRemove, setToRemove] = useState(new Set());
  const [visibleList, setVisibleList] = useState([]);

  useEffect(() => {
    setVisibleList(sortHostnamesAlphabetically(isOptOut ? [...noGoList] : [...goList]));
  }, [isOptOut, noGoList, goList]);

  if (isLoading) {
    return (
      <div className={cn(styles.ManageLists, styles.isLoading)}>
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className={styles.ManageLists}>
      <div className={styles.wrapper}>
        {isOptOut ? (
          <>
            {noGoList.length ? (
              <p>
                We're automatically collecting articles you visit except those matching these {noGoList.length} sites:
              </p>
            ) : (
              <p>We're currently collecting all articles for you. Visit any article and opt-out from the extension.</p>
            )}
          </>
        ) : (
          <>
            {goList.length ? (
              <p>We're automatically collecting articles you visit matching {goList.length} sites:</p>
            ) : (
              <p>
                We're not currently collecting any articles for you. Visit any article and opt-in from the extension.
              </p>
            )}
          </>
        )}
        {error && <div className={styles.error}>Error: {error}</div>}
        <div className={styles.list}>
          {visibleList.map((rule) => (
            <div key={rule} className={styles.row}>
              <label className={styles.rule}>
                <input
                  type={"checkbox"}
                  className={styles.checkbox}
                  onChange={() => {
                    setToRemove((_prev) => {
                      const prev = new Set(_prev);
                      if (prev.has(rule)) {
                        prev.delete(rule);
                      } else {
                        prev.add(rule);
                      }
                      return prev;
                    });
                  }}
                  checked={toRemove.has(rule)}
                />
                {rule}
              </label>
            </div>
          ))}
        </div>
        <div className={styles.toolbar}>
          <button
            disabled={!toRemove.size}
            onClick={() => {
              setVisibleList((prev) => prev.filter((rule) => !toRemove.has(rule)));
              setToRemove(new Set());
              setNeedsSave(true);
            }}
          >
            Remove selected
          </button>
          {needsSave && (
            <button
              disabled={isSaving}
              onClick={() => {
                setIsSaving(true);
                setError(null);

                const fn = isOptOut ? setNoGoList : setGoList;
                const list = isOptOut ? noGoList : goList;
                const hostnames = list.filter((rule) => visibleList.includes(rule));
                fn(hostnames)
                  .then(() => {
                    setIsSaving(false);
                    setNeedsSave(false);
                    setToRemove(new Set());
                    syncUserData({ extensionId });
                  })
                  .catch((error) => {
                    setIsSaving(false);
                    setNeedsSave(false);
                    setError(error.message);
                  });
              }}
            >
              Save changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
