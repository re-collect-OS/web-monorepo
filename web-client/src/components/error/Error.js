import React from "react";
import { Logo } from "web-shared-lib";

export function ErrorUnavailableComponent() {
  const logo = <Logo height={36} style={{ position: "absolute", top: 40, left: 40 }} />;

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {logo}
      <div>
        <h1>We’re down for maintenance</h1>
        <p>Sorry for the inconvenience. Please check back soon!</p>
      </div>
    </div>
  );
}

export function ErrorBoundaryComponent() {
  const logo = <Logo height={36} style={{ position: "absolute", top: 40, left: 40 }} />;

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {logo}

      <div>
        <h1>Sorry, something went wrong</h1>
        <p>
          If the problem persists please{" "}
          <a href="mailto:hello@re-collect.ai?subject=Help" target="_blank" rel="noopener noreferrer">
            get in touch
          </a>
        </p>
      </div>
    </div>
  );
}
