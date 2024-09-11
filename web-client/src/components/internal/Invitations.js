import React, { useEffect, useState, useRef } from "react";
import cn from "classnames";
import {
  IconButton,
  MailIcon,
  AddIcon,
  Menu,
  MenuItem,
  MenuTrigger,
  MenuHorizontalIcon,
  Toast,
  LoadingIndicator,
} from "web-shared-lib";
import { relativeTimeAgo } from "js-shared-lib";

import EmailConfirmationToast from "./EmailConfirmationToast";

import {
  loadInternalInvitations,
  createInternalInvitation,
  sendInternalInvitationEmail,
  deleteInternalInvitation,
  sendInternalInvitationReminderEmail,
} from "../../libs/adminApiLib";

import styles from "./Invitations.module.css";

const STATUS_TO_EMOJI = {
  ENABLED: "⚪",
  DELIVERED: "🗳️",
  OPENED: "👀",
  CLICKED: "⚙️",
  USED: "✅",
  BOUNCED: "⚠️",
  FAILED: "🛑",
};

const STATUS_TO_STR = {
  ENABLED: "CREATED",
  DELIVERED: "DELIVERED",
  OPENED: "OPENED",
  CLICKED: "CLICKED",
  USED: "USED",
  BOUNCED: "BOUNCED",
  FAILED: "FAILED",
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

export default function Invitations() {
  const [isLoading, setIsLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [email, setEmail] = useState("");
  const [shouldSendEmail, setShouldSendEmail] = useState(true);
  const emailConfirmationToastRef = useRef(null);

  useEffect(() => {
    loadInternalInvitations().then((r) => {
      setInvitations(
        r
          .map((model) => ({ ...model, status: model.status.toUpperCase() }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      );
      setIsLoading(false);
    });
  }, []);

  return (
    <Toast.Provider duration={2000}>
      <div className={styles.Invitations}>
        <h2>User invitations</h2>
        <form
          className={styles.extendInvitationForm}
          onSubmit={(event) => {
            event.preventDefault();
            createInternalInvitation({ email })
              .then((record) => {
                setInvitations((prev) => [record, ...prev]);
                setEmail("");
                if (shouldSendEmail) {
                  sendInternalInvitationEmail({ email })
                    .then(() => {
                      emailConfirmationToastRef.current.add({
                        title: "Invite email sent",
                        email,
                      });
                    })
                    .catch((error) => {
                      console.log(">>>error", error);
                    });
                }
              })
              .catch((error) => {
                if (error.response.status === 303) {
                  alert("An invitation for this email already exists!");
                }
                console.log(error);
              });
          }}
        >
          <div className={styles.inputFormGroup}>
            <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <div className={styles.buttonWrapper}>
              <IconButton
                icon={shouldSendEmail ? <MailIcon /> : <AddIcon />}
                title={shouldSendEmail ? "Extend intivation" : "Add invitation"}
                label={shouldSendEmail ? "Extend intivation" : "Add invitation"}
                size="large"
                variant="violet"
                full
              />
            </div>
          </div>
          <div className={styles.emailOptInFormGroup}>
            <label>
              <input
                type="checkbox"
                checked={shouldSendEmail}
                onChange={(event) => setShouldSendEmail(event.target.checked)}
              />
              Send invitation email
            </label>
          </div>
        </form>

        {isLoading && <LoadingIndicator />}
        {!isLoading && (
          <table className={styles.invitationsTable}>
            <tbody>
              {invitations.map((record) => {
                const modifiedDate = new Date(record.timestamp);
                const createdDate = new Date(record.created_at);

                return (
                  <tr
                    key={record.invitation}
                    className={cn(styles.invitationRow, {
                      [styles.fail]: record.status === "FAILED",
                      [styles.warn]: record.status === "BOUNCED",
                      [styles.success]: record.status === "USED",
                    })}
                  >
                    <td className={styles.emailCell}>
                      <>
                        <div className={styles.header}>
                          <div className={styles.statusIcon}>{STATUS_TO_EMOJI[record.status]}</div>
                          <div className={styles.email}>{record.invited_email}</div>
                        </div>
                        {record.registered_email && record.registered_email !== record.invited_email && (
                          <div className={styles.registeredEmail}>Signed up as: {record.registered_email}</div>
                        )}
                        {record.created_at ? (
                          <div className={styles.detail} title={createdDate.toLocaleString()}>
                            invited: {relativeTimeAgo(createdDate)}
                          </div>
                        ) : null}
                        {record.detail ? <div className={styles.detail}>detail: {record.detail}</div> : null}
                      </>
                    </td>
                    <td className={styles.status}>{STATUS_TO_STR[record.status]}</td>
                    <td className={styles.dateRow}>
                      <div className={styles.date} title={modifiedDate.toLocaleString()}>
                        {relativeTimeAgo(modifiedDate)}
                      </div>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <MoreButton
                          menuContent={
                            <Menu align="end">
                              {record.status !== "USED" && (
                                <MenuItem
                                  textValue="invite"
                                  onSelect={() => {
                                    sendInternalInvitationEmail({ email: record.invited_email })
                                      .then(() => {
                                        emailConfirmationToastRef.current.add({
                                          title:
                                            record.status === "ENABLED" ? "Invite email sent" : "Invite email re-sent",
                                          email: record.invited_email,
                                        });
                                      })
                                      .catch((error) => {
                                        console.log(">>>error", error);
                                      });
                                  }}
                                >
                                  {record.status === "ENABLED" ? "Send invite email" : "Re-send invite email"}
                                </MenuItem>
                              )}
                              {!["USED", "ENABLED"].includes(record.status) && (
                                <MenuItem
                                  textValue="remind"
                                  onSelect={() => {
                                    sendInternalInvitationReminderEmail({ email: record.invited_email })
                                      .then(() => {
                                        emailConfirmationToastRef.current.add({
                                          title: "Invite reminder email sent",
                                          email: record.invited_email,
                                        });
                                      })
                                      .catch((error) => {
                                        console.log(">>>error", error);
                                      });
                                  }}
                                >
                                  Send invite reminder email
                                </MenuItem>
                              )}
                              <MenuItem
                                textValue="copy"
                                onSelect={() => {
                                  navigator.clipboard.writeText(
                                    `http${window.location.hostname === "localhost" ? "" : "s"}://${
                                      window.location.host
                                    }/signup?invitation=${record.invitation}`
                                  );
                                }}
                              >
                                Copy invitation link
                              </MenuItem>
                              <MenuItem
                                variant="destructive"
                                textValue="delete"
                                onSelect={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete the unclaimed invitation to ${record.invited_email}`
                                    )
                                  ) {
                                    deleteInternalInvitation({ email: record.invited_email })
                                      .then(() => {
                                        setInvitations((prev) =>
                                          prev.filter((r) => r.invited_email !== record.invited_email)
                                        );
                                      })
                                      .catch((error) => {
                                        console.log(">>>error", error);
                                      });
                                  }
                                }}
                              >
                                Delete invitation
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
        )}
      </div>
      <div className={styles.toastContainer}>
        <Toast.Viewport className={styles.toastViewport} />
        <EmailConfirmationToast ref={emailConfirmationToastRef} />
      </div>
    </Toast.Provider>
  );
}
