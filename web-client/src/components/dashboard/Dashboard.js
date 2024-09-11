import React from 'react';
import { useHistory } from 'react-router-dom';

import AlertWidget from "./AlertWidget";  // Import the AlertWidget

import styles from "./Dashboard.module.css";

// Inline styles for vertical centering
const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',  // Full viewport height for vertical centering
  flexDirection: 'column',  // Ensures items are stacked vertically
};

export default function Dashboard() {
  const history = useHistory();

  // Function to redirect, can be invoked on a button click or other event if needed
  const handleRedirect = () => {
    history.push('/welcome');  // Redirect to a different route if necessary
  };

  return (
    <div className={styles.Dashboard} style={containerStyle}>
      <h1 className={styles.title}>re:collect has shut down as of 09/03/2024</h1>
      <p>If you need assistance, e-mail hello@re-collect.ai</p>
    </div>
  );
}
