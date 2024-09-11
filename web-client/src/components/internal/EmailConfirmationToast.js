import React, { useState, forwardRef, useImperativeHandle } from "react";

import { Toast } from "web-shared-lib";

import styles from "./EmailConfirmationToast.module.css";

const ToastUI = ({ title, email, ...props }) => {
  return (
    <Toast.Root className={styles.Toast} {...props}>
      <div className={styles.leftCol}>
        <Toast.Title className={styles.title}>{title}</Toast.Title>
        <Toast.Description className={styles.description}>{email}</Toast.Description>
      </div>
    </Toast.Root>
  );
};

const EmailConfirmationToast = forwardRef((props, forwardedRef) => {
  const [queue, setQueue] = useState([]);

  useImperativeHandle(forwardedRef, () => ({
    add: ({ title, email }) => setQueue((prev) => [...prev, { title, email }]),
  }));

  return (
    <>
      {queue.map(({ title, email }, index) => (
        <ToastUI key={index} title={title} email={email} {...props} />
      ))}
    </>
  );
});

export default EmailConfirmationToast;
