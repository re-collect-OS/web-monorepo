import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "web-shared-lib";
import { GlobalNoGoList, GlobalNoAutoCollectList, stripWWW, onlyUnique } from "js-shared-lib";

import { getFullHistory, extensionId } from "../../libs/chromeExtensionLib";

import styles from "./History.module.css";

const globalNoGoList = [...GlobalNoGoList, ...GlobalNoAutoCollectList]
  .map((hostname) => stripWWW(hostname))
  .filter(onlyUnique);

export default function History() {
  const [stats, setStats] = useState([]);
  const [count, setCount] = useState(null);

  useEffect(() => {
    getFullHistory({
      extensionId,
      noGoList: globalNoGoList,
    })
      .then((response) => {
        setStats(response.history.stats);
        const uniqueUrls = response.history.visits.map((visit) => visit.url).filter(onlyUnique);
        setCount(uniqueUrls.length);
      })
      .catch((error) => {
        console.warn("Could not sync history:", error.message);
      });
  }, []);

  return (
    <div className={styles.History}>
      <Link to={"/"} className={styles.logoLink}>
        <Logo height={36} />
      </Link>

      <h2>History</h2>
      {count === null && <p>Loading...</p>}
      {count !== null && (
        <>
          <p>Total: {count}</p>
          <table>
            <tbody>
              {stats.map(([hostname, count]) => (
                <tr key={hostname}>
                  <td>{hostname}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
