import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';

import Dashboard from './components/dashboard';
import ErrorBoundary from './components/ErrorBoundary';

export default function Routes() {
  return (
    <ErrorBoundary>
      <Switch>
        {/* Default route for Dashboard */}
        <Route path="/">
          <Dashboard />
        </Route>
        
        {/* Catch-all redirect to the Dashboard if no other routes are matched */}
        <Redirect to="/" />
      </Switch>
    </ErrorBoundary>
  );
}

