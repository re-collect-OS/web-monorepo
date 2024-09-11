export function getDeployRef() {
  return new Promise((resolve, reject) => {
    fetch("/.netlify/functions/version", {
      method: "GET",
    })
      .then((response) => response.text())
      .then((text) => {
        let resp = {};
        try {
          resp = JSON.parse(text);
        } catch (error) {
          new Error(`getDeployRef: could not parse response as JSON`);
        }
        if (resp.ref) {
          resolve(resp.ref);
        } else {
          reject(new Error(`getDeployRef: could not get deploy ref`));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}
