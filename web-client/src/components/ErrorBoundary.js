import React from "react";
import * as Sentry from "@sentry/react";

import { ErrorUnavailableComponent, ErrorBoundaryComponent } from "./error";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error
    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  render() {
    if (this.state.error) {
      if (this.state.error.response?.status === 503) {
        return <ErrorUnavailableComponent />;
      }

      return <ErrorBoundaryComponent />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
