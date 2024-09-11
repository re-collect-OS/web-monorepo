import React from "react";
import { shallow } from "zustand/shallow";
import { IconButton } from "web-shared-lib";
import { useHistory } from "react-router-dom";

import { useStore } from "../../store";
import apiLib from "../../libs/apiLib";
const { USER_SETTING_IS_OPT_OUT } = apiLib;

import {
  canInstallExtension,
  openChromeExtensionInstaller,
  syncUserData,
  extensionId,
} from "../../libs/chromeExtensionLib";

import { events, analyticsService, sources } from "../../libs/analyticsLib";

import styles from "./Extension.module.css";

const selector = (state) => ({
  accountSettings: state.user.accountSettings,
  doSetAccountSetting: state.doSetAccountSetting,
});

export default function Prefs() {
  const { accountSettings, doSetAccountSetting } = useStore(selector, shallow);
  const history = useHistory();
  const isOptOut = !!accountSettings[USER_SETTING_IS_OPT_OUT];
  const onChange = (event) => {
    const isOptOut = event.target.value === "opt-out";
    doSetAccountSetting({ key: USER_SETTING_IS_OPT_OUT, value: isOptOut }).then(() => {
      // Instruct extension to re-sync user data
      syncUserData({ extensionId });
    });
    analyticsService.logEvent(events.settingsExtensionSwitchedStrategy({ isOptOut, source: sources.SETTINGS }));
  };

  return (
    <div className={styles.Extension}>
      <div className={styles.wrapper}>
        <div className={styles.section}>
          <h3 className={styles.subtitle}>Chrome Web Store listing</h3>
          <p className={styles.description}>Launch the store listing to manage the browser extension:</p>
          <IconButton
            disabled={!canInstallExtension()}
            title={"Launch extension store listing"}
            label={"Launch extension store listing"}
            size={"large"}
            onClick={() => {
              openChromeExtensionInstaller(extensionId);
            }}
          />
        </div>

        <div className={styles.section}>
          <h3 className={styles.subtitle}>Collection strategy</h3>
          <p className={styles.description}>
            Besides manually adding content to re:collect, the browser extension also has several options to
            automatically collect content as you read. Select your preferred article auto-collection strategy:
          </p>
          <ul className={styles.strategyList}>
            <li>
              <input type="radio" id="opt-out" name="strategy" value="opt-out" checked={isOptOut} onChange={onChange} />
              <label htmlFor="opt-out">
                <strong>Opt-out strategy</strong>: we auto-collect meaningful content as you browse the web and you
                control what places you don't want the extension to acccess. No worries, we automatically exclude sites
                with personal and sensitive information.
              </label>
            </li>
            <li>
              <input type="radio" id="opt-in" name="strategy" value="opt-in" checked={!isOptOut} onChange={onChange} />
              <label htmlFor="opt-in">
                <strong>Opt-in strategy</strong>: you manually choose what places you want the extension to auto-collect
                from (if any).
              </label>
            </li>
          </ul>
        </div>

        <div className={styles.section}>
          <h3 className={styles.subtitle}>Manage auto-collect list</h3>
          <p className={styles.description}>
            You have control over the list of sites the extension auto-collects articles from:
          </p>
          <IconButton
            label={"Edit auto-collect list"}
            title={"Edit auto-collect list"}
            size={"large"}
            onClick={() => history.push("/settings/lists")}
          />
        </div>
      </div>
    </div>
  );
}
