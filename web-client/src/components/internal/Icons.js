import React from "react";

import * as webSharedLib from "web-shared-lib";

import styles from "./Icons.module.css";

function filterComponentsWithIcon(module) {
  const componentsWithIcon = [];

  for (let member in module) {
    if (
      Object.prototype.hasOwnProperty.call(module, member) &&
      typeof module[member] === "function" &&
      member.toLowerCase().includes("icon")
    ) {
      componentsWithIcon.push(module[member]);
    }
  }

  return componentsWithIcon;
}

function sortComponentsByName(components) {
  return components.sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();

    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });
}

const iconComponents = sortComponentsByName(filterComponentsWithIcon(webSharedLib));

export default function IconGallery() {
  return (
    <div className={styles.IconGallery}>
      <div className={styles.header}>
        <h1>Icon Library</h1>
        <p>
          Dynamically generated list of all the icons in web-shared-lib. The majority of icons are from{" "}
          <a href="https://www.systemuicons.com">systemuicons.com</a>.
        </p>
      </div>
      <div className={styles.iconGrid}>
        {iconComponents.map((Icon, index) => {
          return (
            <div key={index} className={styles.iconCell} title={Icon.displayName}>
              <div className={styles.icon}>
                <Icon />
              </div>
              <div className={styles.label}>{Icon.displayName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
