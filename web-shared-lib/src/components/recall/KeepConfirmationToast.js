import React, { useState, forwardRef, useImperativeHandle } from "react";
import * as Toast from "@radix-ui/react-toast";

import { CheckIcon } from "../icons";
import IconButton from "../icon-button";

import styles from "./KeepConfirmationToast.module.css";

const ToastUI = ({ title, doAction, ...props }) => {
  return (
    <Toast.Root className={styles.Toast} {...props}>
      <div className={styles.leftCol}>
        <CheckIcon className={styles.icon} />
        <Toast.Title className={styles.title}>
          <div>{title}</div>
        </Toast.Title>
      </div>
      <div className={styles.rightCol}>
        <Toast.Action altText="Go to card" asChild>
          <IconButton
            type={"button"}
            label={"Go to card"}
            title={"Go to card"}
            variant={"violet"}
            onClick={() => {
              if (doAction) {
                doAction();
              }
            }}
          />
        </Toast.Action>
      </div>
    </Toast.Root>
  );
};

const KeepConfirmationToast = forwardRef((props, forwardedRef) => {
  const [queue, setQueue] = useState([]);

  useImperativeHandle(forwardedRef, () => ({
    add: ({ title, doAction }) => setQueue((prev) => [...prev, { title, doAction }]),
  }));

  return (
    <>
      {queue.map(({ title, doAction }, index) => (
        <ToastUI key={index} title={title} doAction={doAction} {...props} />
      ))}
    </>
  );
});

export default KeepConfirmationToast;
