export function sendFeedbackEmail({ email, message }) {
  return new Promise((resolve, reject) => {
    fetch("/.netlify/functions/sendmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message }),
    })
      .then((response) => {
        if (response.status === 200) {
          resolve();
        } else {
          reject(new Error(`Request failed with status: ${response.status}`));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}
