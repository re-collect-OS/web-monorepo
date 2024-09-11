import React from "react";
import { GlobalNoGoList, GlobalNoAutoCollectList, stripWWW, onlyUnique } from "js-shared-lib";

const globalNoGoList = [...GlobalNoGoList, ...GlobalNoAutoCollectList]
  .map((hostname) => stripWWW(hostname))
  .filter(onlyUnique)
  .sort();

export default function NoGoList() {
  return (
    <div style={{ padding: 20 }}>
      {globalNoGoList.map((value) => (
        <div key={value} style={{ padding: "8px 20px" }}>
          {value}
        </div>
      ))}
    </div>
  );
}
