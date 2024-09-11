import React from "react";
import { useHistory } from "react-router-dom";
import { ArrowRightIcon, AddIcon } from "web-shared-lib";
import { shallow } from "zustand/shallow";

import { useStore } from "../../store";
import { events, sources, analyticsService } from "../../libs/analyticsLib";

import Widget, {
  WidgetHeader,
  WidgetNavButton,
  WidgetRow,
  WidgetLoadingIndicator,
  WidgetInfoHeader,
  WidgetIconRow,
} from "./Widget";

import styles from "./SubscriptionsWidget.module.css";

const selector = (state) => ({
  count: state.subscriptions.records?.length || 0,
  isLoading: state.subscriptions.status === "loading",
});

export default function SubscriptionsWidget({ forceFreshAccountStatus = false }) {
  const { isLoading, count } = useStore(selector, shallow);
  const history = useHistory();
  const onClick = () => {
    history.push("/subscriptions");
    analyticsService.logEvent(events.subscriptionsOpened({ source: sources.HOME }));
  };
  const onAddClick = () => {
    history.push("/subscriptions#add_subscription=1");
    analyticsService.logEvent(events.subscriptionsOpened({ source: sources.HOME }));
  };
  const hasSubscriptions = forceFreshAccountStatus ? false : !!count;

  return (
    <Widget>
      <WidgetHeader title={"Subscriptions"}>
        <WidgetNavButton icon={<ArrowRightIcon />} title={"Go to Subscriptions"} onClick={onClick} />
        <WidgetNavButton icon={<AddIcon />} title={"Add a new Subscription"} onClick={onAddClick} />
      </WidgetHeader>
      {isLoading && <WidgetLoadingIndicator />}
      {!isLoading && !hasSubscriptions && (
        <>
          <WidgetInfoHeader title={"Do you subscribe to any newsletters?"}>
            <p>
              Don’t miss out on valuable content - add your favorite newsletters to your account with subscriptions and
              resurface insights from them via Recall.
            </p>
          </WidgetInfoHeader>
          <WidgetIconRow label={"Add a Subscription"} icon={<AddIcon />} onClick={onAddClick} />
        </>
      )}
      {!isLoading && hasSubscriptions && (
        <WidgetRow className={styles.row} onClick={onClick}>
          <div className={styles.count}>{count}</div>
          <div className={styles.description}>active {count === 1 ? "subscription" : "subscriptions"}</div>
        </WidgetRow>
      )}
    </Widget>
  );
}
