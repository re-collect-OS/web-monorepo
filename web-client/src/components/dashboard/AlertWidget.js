import React, { useState, useEffect } from "react";
import { useStore } from "../../store";
import { IconButton } from "web-shared-lib"; // assuming you have a button component in your shared library
import Widget from "./Widget";
import styles from "./DailyLogWidget.module.css"; // assuming the old styles were stored here

export default function AlertWidget() {
  const { doDownloadFile } = useStore((state) => ({
    doDownloadFile: state.doDownloadFile,
  }));

  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const calculateDaysLeft = () => {
      const today = new Date();
      console.log("Current Date:", today); // Log the current date

      const targetDate = new Date("2024-09-03");
      console.log("Target Date:", targetDate); // Log the target date

      const timeDifference = targetDate - today;
      console.log("Time Difference (ms):", timeDifference); // Log the time difference in milliseconds

      const daysLeft = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
      console.log("Days Left:", daysLeft); // Log the number of days left

      setDaysLeft(daysLeft);
    };

    calculateDaysLeft();
    const intervalId = setInterval(calculateDaysLeft, 86400000); // Update every 24 hours

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  const handleDownload = () => {
    doDownloadFile()
      .then((response) => {
        console.log("Download successful", response);

        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'downloaded_file.zip'; // assuming it's always a zip file
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log("Download initiated for the file.");
      })
      .catch((error) => {
        console.error("Download failed", error);
      });
  };

  return (
    <Widget style={{ backgroundColor: "rgb(237, 237, 253)", padding: "5px" }}>
      <div className={styles.alertTextWrapper} style={{ marginLeft: "10px" }}>
        <h3 style={{ paddingTop: "-5px" }}>Notice</h3>
        <p>
          re:collect is shutting down. Your account will be deactivated and your data deleted in {daysLeft} days. Click the button below to export your data.
        </p>
        <IconButton
          label={"Export"}
          onClick={handleDownload}
          title={"Download the related file"}
        />
      </div>
      <div style={{ paddingTop: "5px" }}></div>
    </Widget>
  );
}
