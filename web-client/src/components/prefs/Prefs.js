import React from "react";
import { Switch } from "web-shared-lib";
import { shallow } from "zustand/shallow";
import { debounce } from "js-shared-lib";
import { useStore } from "../../store";

import { syncUserData, extensionId } from "../../libs/chromeExtensionLib";

import styles from "./Prefs.module.css";

const selector = (state) => ({
  prefs: state.prefs,
  accountSettings: state.user.accountSettings,
  doSetAccountSetting: state.doSetAccountSetting,
  availableEngines: state.user.availableEngines,
});

const keyToPrefKey = (key, prefix = "pref") => {
  return prefix + key.charAt(0).toUpperCase() + key.slice(1);
};

const BASE_URL = "/settings/prefs";

const persistValue = ({ key, value }) => {
  window.location.href = `${BASE_URL}?${key}=${encodeURIComponent(value)}`;
};
const debouncedPersistValue = debounce(persistValue, { delay: 700 });

function renderTable({ prefs, availableEngines, doShapeKey, doShapeValue, onChange }) {
  return Object.keys(prefs)
    .sort()
    .map((key) => {
      let prefValue = prefs[key];
      let value;

      if (key === "engine") {
        value = (
          <select
            className={styles.input}
            name={"engine"}
            defaultValue={prefValue}
            onChange={(event) => {
              onChange({ key: doShapeKey(key), value: doShapeValue(event.target.value), debounce: true });
            }}
          >
            <option value={""}>default</option>
            {availableEngines.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        );
      } else if (typeof prefValue === "boolean") {
        value = (
          <Switch
            onCheckedChange={() => {
              onChange({ key: doShapeKey(key), value: doShapeValue(!prefValue) });
            }}
            checked={prefValue}
          />
        );
      } else if (typeof prefValue === "number") {
        value = (
          <input
            className={styles.input}
            type={"number"}
            step={prefValue % 1 === 0 ? "1" : "0.1"}
            name={key}
            defaultValue={prefValue}
            onChange={(event) => {
              onChange({ key: doShapeKey(key), value: doShapeValue(event.target.value), debounce: true });
            }}
          />
        );
      } else if (typeof prefValue === "string") {
        value = (
          <input
            className={styles.input}
            type={"text"}
            name={key}
            onChange={(event) => {
              onChange({ key: doShapeKey(key), value: doShapeValue(event.target.value), debounce: true });
            }}
          />
        );
      } else {
        value = <span>{prefs[key]}</span>;
      }
      return (
        <tr key={key}>
          <td className={styles.labelRow}>
            <strong>{key}</strong>
          </td>
          <td className={styles.valueRow}>{value}</td>
        </tr>
      );
    });
}

export default function Prefs() {
  const { prefs, accountSettings, doSetAccountSetting, availableEngines } = useStore(selector, shallow);
  const prefList = renderTable({
    prefs,
    availableEngines,
    doShapeKey: keyToPrefKey,
    doShapeValue: (value) => {
      if (typeof value === "boolean") {
        return value ? "on" : "off";
      }
      return value;
    },
    onChange: ({ key, value, debounce = false }) => {
      if (debounce) {
        debouncedPersistValue({ key, value });
      } else {
        persistValue({ key, value });
      }
    },
  });
  const accountSettingsList = renderTable({
    prefs: accountSettings,
    doShapeKey: (k) => k,
    doShapeValue: (v) => v,
    onChange: ({ key, value }) => {
      doSetAccountSetting({ key, value }).then(() => {
        // Instruct extension to re-sync user data
        syncUserData({ extensionId });
      });
    },
  });

  return (
    <div className={styles.Prefs}>
      <div className={styles.wrapper}>
        <h3 className={styles.title}>Local prefs</h3>
        <p className={styles.description}>Prefs persist locally on this machine and browser.</p>
        <table className={styles.prefsTable}>
          <tbody>{prefList}</tbody>
        </table>

        <h3 className={styles.title}>Account settings</h3>
        <p className={styles.description}>Account settings persist on the server.</p>
        <table className={styles.prefsTable}>
          <tbody>{accountSettingsList}</tbody>
        </table>
      </div>
    </div>
  );
}
