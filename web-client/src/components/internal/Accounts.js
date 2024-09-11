import React, { useEffect, useState, useRef, useMemo } from "react";
import cn from "classnames";
import { useHistory } from "react-router-dom";
import { Toast, Menu, MenuItem, MenuTrigger, MenuHorizontalIcon, LoadingIndicator, IconButton } from "web-shared-lib";

import {
  loadInternalAccounts,
  loadInternalAccountStats,
  loadInternalOnboardingStats,
  sendInternalInvitationNudgeEmail,
  sendInternalInvitationOnboardingCompleteEmail,
} from "../../libs/adminApiLib";
import { useQuery } from "../../utils/router";

import EmailConfirmationToast from "./EmailConfirmationToast";

import styles from "./Accounts.module.css";

const STATUS_TO_DESCRIPTION = {
  created: "created",
  onboarded: "-", // legacy
  waiting_for_call: "-", // legacy
  ready: "submitted data",
  ready_waiting_on_data: "waiting on data",
  ready_has_data: "has data and waiting on product onboarding",
  ready_has_video: "completed product onboarding",
  ready_has_video_waiting_on_data: "completed product onboarding and waiting on data",
  ready_onboarded: "fully onboarded",
};

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

const sortRecords = ({ records, sort }) => {
  return records.sort((a1, a2) => {
    if (sort === "engine") {
      return a1.engine.localeCompare(a2.engine, "en", { ignorePunctuation: true });
    }
    if (sort === "status") {
      const keys = Object.keys(STATUS_TO_DESCRIPTION);
      return keys.indexOf(a1.status) - keys.indexOf(a2.status);
    }
    if (sort === "strategy") {
      return a1.strategy.localeCompare(a2.strategy, "en", { ignorePunctuation: true });
    }
    if (sort === "modified") {
      return new Date(a2.modified) - new Date(a1.modified);
    }
    if (sort === "created") {
      return new Date(a2.created) - new Date(a1.created);
    }
    console.warn("Unexpected sort criteria:", sort);
  });
};

function Status({ value }) {
  let rows;
  const stepsTitle = [
    `1. created account (debug: ${value})`,
    `2. has submitted data (debug: ${value})`,
    `3. has completed product onboarding (debug: ${value})`,
    `4. has data - processing (debug: ${value})`,
    `4. has data (debug: ${value})`,
  ];
  if (value === "created") {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[4]} className={cn(styles.row, styles.isOff)} />
      </>
    );
  } else if (value === "ready") {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[4]} className={cn(styles.row, styles.isOff)} />
      </>
    );
  } else if (value === "ready_waiting_on_data") {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[3]} className={cn(styles.row, styles.isWaiting)} />
      </>
    );
  } else if (value === "ready_has_data") {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[4]} className={cn(styles.row, styles.isOn)} />
      </>
    );
  } else if (value === "ready_has_video") {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[4]} className={cn(styles.row, styles.isOff)} />
      </>
    );
  } else if (value === "ready_has_video_waiting_on_data") {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[3]} className={cn(styles.row, styles.isWaiting)} />
      </>
    );
  } else if (value === "ready_onboarded") {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOn)} />
        <div title={stepsTitle[4]} className={cn(styles.row, styles.isOn)} />
      </>
    );
  } else {
    rows = (
      <>
        <div title={stepsTitle[0]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[1]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[2]} className={cn(styles.row, styles.isOff)} />
        <div title={stepsTitle[4]} className={cn(styles.row, styles.isOff)} />
      </>
    );
  }

  return <div className={styles.statusWrapper}>{rows}</div>;
}

export default function Accounts() {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [sort, setSort] = useState("modified");
  const [stats, setStats] = useState({});
  const [isStatsLoading, setIsStatsLoading] = useState(!!expandedEmail);

  const history = useHistory();
  const emailConfirmationToastRef = useRef(null);
  const routerQuery = useQuery();
  const expandedEmail = routerQuery.get("expand");

  useEffect(() => {
    Promise.allSettled([loadInternalOnboardingStats(), loadInternalAccounts({ limit: 1000 })]).then((values) => {
      const stats = values[0].status === "fulfilled" ? values[0].value : { onboarded: [], currently_onboarding: [] };
      // Flatten currently onboarding stats:
      // "currently_onboarding": [{ "unretrieved": 2446, "user_id": "aaba8f0b-2cc1-4983-9041-39eea3947055", "unprocessed": 0 }]
      if (stats.currently_onboarding.length) {
        stats.currently_onboarding = stats.currently_onboarding.map((r) => r.user_id);
      }
      const records = values[1].status === "fulfilled" ? values[1].value : [];

      const accountRecords = records.map((a) => {
        const isWaitingForData = stats.currently_onboarding.includes(a.user_id);
        const hasData = stats.onboarded.includes(a.user_id);
        const hasCompletedProdOnboarding = !!a.settings.client_settings?.has_completed_product_onboarding;
        const hasSubmittedData = a.status === "ready";

        let status = "created";
        if (hasSubmittedData) {
          status = "ready";
          if (!hasCompletedProdOnboarding) {
            if (isWaitingForData) {
              status = "ready_waiting_on_data";
            } else if (hasData) {
              status = "ready_has_data";
            }
          } else {
            status = "ready_has_video";
            if (isWaitingForData) {
              status = "ready_has_video_waiting_on_data";
            } else if (hasData) {
              status = "ready_onboarded";
            }
          }
        }

        const engine = a.settings.default_engine || "weaviate";
        const strategy = a.settings.client_settings?.is_opt_out ? "opt-out" : "opt-in";
        const modifiedDate = a.modified ? new Date(a.modified) : null;
        const createdDate = a.created ? new Date(a.created) : null;
        return { ...a, status, engine, strategy, modifiedDate, createdDate };
      });
      setAccounts(accountRecords);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (expandedEmail) {
      setIsStatsLoading(true);
      loadInternalAccountStats({ email: expandedEmail }).then((stats) => {
        setStats(stats.urlstate_state);
        setIsStatsLoading(false);
      });
    }
  }, [expandedEmail]);

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 1);
  }, [expandedEmail]);

  const sortedAccounts = useMemo(() => sortRecords({ records: accounts, sort }), [accounts, sort]);

  const total = accounts.length;
  const sortSelect = (
    <select name="order" onChange={(event) => setSort(event.target.value)} value={sort}>
      <option value="created">created date</option>
      <option value="modified">modified date</option>
      <option value="status">status</option>
      <option value="strategy">strategy</option>
      <option value="engine">engine</option>
    </select>
  );

  return (
    <Toast.Provider duration={2000}>
      <div className={styles.Accounts}>
        <h2>Accounts</h2>
        {isLoading && <LoadingIndicator />}
        {!isLoading && (
          <>
            {expandedEmail && (
              <div className={styles.expandedAccountStats}>
                <h2>{expandedEmail}</h2>
                {isStatsLoading && <LoadingIndicator />}
                {!isStatsLoading && (
                  <table className={styles.statsTable} cellSpacing="0" cellPadding="0">
                    <tbody>
                      {Object.keys(stats).map((key) => (
                        <tr key={key}>
                          <td>
                            <strong>{key}</strong>
                          </td>
                          <td>{stats[key]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className={styles.nav}>
                  <IconButton
                    label="Dismiss"
                    title={"Dismiss"}
                    onClick={() => {
                      history.push("/internal/accounts");
                    }}
                  />
                </div>
              </div>
            )}
            <div className={styles.sortBy}>
              Sort {total} accounts by: {sortSelect}
            </div>
            <table className={styles.accountsTable} cellSpacing="0" cellPadding="0">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col">Strategy</th>
                  <th scope="col">Engine</th>
                  <th scope="col">Created</th>
                  <th scope="col">Modified</th>
                  <th scope="col" className={styles.moreColumn} />
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((record) => {
                  return (
                    <tr key={record.user_id}>
                      <td>{record.email}</td>
                      <td title={STATUS_TO_DESCRIPTION[status]}>
                        <Status value={record.status} />
                      </td>
                      <td>{record.strategy}</td>
                      <td>{record.engine}</td>
                      <td title={record.createdDate ? record.createdDate?.toLocaleString() : undefined}>
                        {record.createdDate ? record.createdDate?.toLocaleDateString("en-US") : "-"}
                      </td>
                      <td title={record.modifiedDate ? record.modifiedDate.toLocaleString() : "-"}>
                        {record.modifiedDate?.toLocaleDateString("en-US")}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <MoreButton
                            menuContent={
                              <Menu align="end">
                                <MenuItem
                                  textValue="copy user ID"
                                  onSelect={() => {
                                    navigator.clipboard.writeText(record.user_id);
                                  }}
                                >
                                  Copy account ID
                                </MenuItem>
                                <MenuItem
                                  textValue="view account stats"
                                  onSelect={() => {
                                    history.push(`/internal/accounts?expand=${encodeURIComponent(record.email)}`);
                                  }}
                                >
                                  View account stats
                                </MenuItem>
                                <MenuItem
                                  textValue="open Amplitude log"
                                  onSelect={() => {
                                    window.open(
                                      `https://app.amplitude.com/analytics/re-collect/project/346592/search/${encodeURIComponent(
                                        record.email
                                      )}`,
                                      "_blank"
                                    );
                                  }}
                                >
                                  Open Amplitude log
                                </MenuItem>
                                {record.status === "created" && (
                                  <MenuItem
                                    textValue="nudge"
                                    onSelect={() => {
                                      sendInternalInvitationNudgeEmail({ email: record.email })
                                        .then(() => {
                                          emailConfirmationToastRef.current.add({
                                            title: "Finish signup nudge email sent",
                                            email: record.email,
                                          });
                                        })
                                        .catch((error) => {
                                          console.log(">>>error", error);
                                        });
                                    }}
                                  >
                                    Send finish signup email
                                  </MenuItem>
                                )}
                                {["ready"].includes(record.status) && (
                                  <MenuItem
                                    textValue="nudge"
                                    onSelect={() => {
                                      sendInternalInvitationOnboardingCompleteEmail({ email: record.email })
                                        .then(() => {
                                          emailConfirmationToastRef.current.add({
                                            title: "Onboarding complete email sent",
                                            email: record.email,
                                          });
                                        })
                                        .catch((error) => {
                                          console.log(">>>error", error);
                                        });
                                    }}
                                  >
                                    Send onboarding complete email
                                  </MenuItem>
                                )}
                                <MenuItem
                                  variant="destructive"
                                  textValue="delete"
                                  onSelect={() => {
                                    if (window.confirm(`Just kidding, we can't delete ${record.email} yet`)) {
                                      // todo
                                    }
                                  }}
                                >
                                  Delete account
                                </MenuItem>
                              </Menu>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
      <div className={styles.toastContainer}>
        <Toast.Viewport className={styles.toastViewport} />
        <EmailConfirmationToast ref={emailConfirmationToastRef} />
      </div>
    </Toast.Provider>
  );
}
