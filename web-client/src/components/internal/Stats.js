import React, { useEffect, useState } from "react";
import { LoadingIndicator } from "web-shared-lib";
import { loadInternalGlobalStats } from "../../libs/adminApiLib";

import styles from "./Stats.module.css";

// Sample stats output:
// {
//     "recall": {
//         "query": "Creativity is our greatest human asset",
//         "user_id": "f080970b-cb08-48d8-846f-48184c5e97ea",
//         "num_connections": 10,
//         "query_times": [
//             "0.26 seconds",
//             "0.27 seconds",
//             "0.25 seconds"
//         ]
//     },
//     "weaviate": {
//         "Sentence": {
//             "vectors": {
//                 "count": 8604982,
//                 "count_human_readable": "8.6 million",
//                 "memory_estimate (@length 768, float32)": "49.2 GiB"
//             }
//         },
//         "Paragraph_v20230517": {
//             "vectors": {
//                 "count": 425815,
//                 "count_human_readable": "425.8 thousand",
//                 "memory_estimate (@length 768, float32)": "2.4 GiB"
//             }
//         }
//     },
//     "incoming_urlvisit": {
//         "total": {
//             "count": 0,
//             "count_human_readable": "0"
//         }
//     },
//     "user_account": {
//         "total": {
//             "count": 238,
//             "count_human_readable": "238"
//         }
//     },
//     "urlstate": {
//         "total": {
//             "count": 374281,
//             "count_human_readable": "374.3 thousand"
//         },
//         "urlstate.state": {
//             "content retrieval required": {
//                 "count": 0,
//                 "count_human_readable": "0"
//             },
//             "processing in progress": {
//                 "count": 80,
//                 "count_human_readable": "80"
//             },
//             "processing complete": {
//                 "count": 217245,
//                 "count_human_readable": "217.2 thousand"
//             },
//             "processing failed": {
//                 "count": 116720,
//                 "count_human_readable": "116.7 thousand"
//             },
//             "processing required": {
//                 "count": 0,
//                 "count_human_readable": "0"
//             },
//             "content provided": {
//                 "count": 0,
//                 "count_human_readable": "0"
//             },
//             "content retrieval failed": {
//                 "count": 40231,
//                 "count_human_readable": "40.2 thousand"
//             },
//             "content retrieval complete": {
//                 "count": 0,
//                 "count_human_readable": "0"
//             },
//             "content retrieval in progress": {
//                 "count": 5,
//                 "count_human_readable": "5"
//             },
//             "removing": {
//                 "count": 0,
//                 "count_human_readable": "0"
//             },
//             "removal failed": {
//                 "count": 0,
//                 "count_human_readable": "0"
//             }
//         }
//     }
// }

function Table({ stats }) {
  return (
    <table className={styles.table}>
      <tbody>
        {Object.keys(stats).map((key) => {
          const value = stats[key];
          return (
            <tr key={key}>
              <td className={styles.min}>
                <strong>{key}</strong>
              </td>
              <td>{value}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RecallStats({ stats }) {
  const count = stats.query_times.length;
  const sum = stats.query_times.map((s) => parseFloat(s.split(" ")[0])).reduce((acc, v) => acc + v, 0);
  const unit = stats.query_times[0].split(" ")[1];
  const avg = sum / count;

  return (
    <div className={styles.cell}>
      <div className={styles.title}>Recall</div>
      <Table
        stats={{
          Query: `"${stats.query}"`,
          "Average recall time": `${Math.round(avg * 100) / 100} ${unit}`,
        }}
      />
    </div>
  );
}

function WeaviateStats({ stats }) {
  return (
    <div className={styles.cell}>
      <div className={styles.title}>Weaviate</div>
      <Table
        stats={{
          Sentence: stats.Sentence
            ? `${stats.Sentence?.vectors.count_human_readable} (estimated memory ${stats.Sentence.vectors["memory_estimate (@length 768, float32)"]})`
            : "-",
          Paragraph_v20231120: `${stats.Paragraph_v20231120.vectors.count_human_readable} (estimated memory ${stats.Paragraph_v20231120.vectors["memory_estimate (@length 768, float32)"]})`,
        }}
      />
    </div>
  );
}

function UserAccountStats({ stats }) {
  return (
    <div className={styles.cell}>
      <div className={styles.title}>User accounts</div>
      <Table stats={{ Total: stats.total.count_human_readable }} />
    </div>
  );
}

function IncomingUrlvisitStats({ stats }) {
  return (
    <div className={styles.cell}>
      <div className={styles.title}>Incoming urlvisits</div>
      <Table stats={{ Total: stats.total.count_human_readable }} />
    </div>
  );
}

function ArtifactStats({ stats }) {
  const totalStats = { Total: stats.urlstate.total.count_human_readable };
  const stateStats = Object.keys(stats.urlstate["urlstate.state"]).reduce((acc, key) => {
    return { ...acc, [key]: stats.urlstate["urlstate.state"][key].count_human_readable };
  }, {});
  return (
    <div className={styles.cell}>
      <div className={styles.title}>Artifacts</div>
      <Table stats={{ ...stateStats, ...totalStats }} />
    </div>
  );
}

function SystemStats({ stats }) {
  return (
    <div className={styles.cellWrapper}>
      <RecallStats stats={stats.recall} />
      <WeaviateStats stats={stats.weaviate} />
      <UserAccountStats stats={stats.user_account} />
      <IncomingUrlvisitStats stats={stats.incoming_urlvisit} />
      <ArtifactStats stats={stats} />
    </div>
  );
}

export default function Stats() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    const sync = () => {
      loadInternalGlobalStats().then((stats) => {
        setStats(stats);
        setIsLoading(false);
      });
    };

    sync();

    let intervalId = setInterval(sync, 300000); // refresh every 5 min

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, []);

  return (
    <div className={styles.Stats}>
      <h2>System stats</h2>
      {isLoading && <LoadingIndicator />}
      {!isLoading && <SystemStats stats={stats} />}
    </div>
  );
}
