import React, { useMemo, useRef } from "react";
import cn from "classnames";
import { shallow } from "zustand/shallow";
import { useParams, useHistory } from "react-router-dom";
import {
  DailyLogMenuIcon,
  DownloadsIcon,
  HomeMenuIcon,
  IntegrationsMenuIcon,
  LibraryMenuIcon,
  Logo,
  LogoIcon,
  NotificationsActiveMenuIcon,
  NotificationsMenuIcon,
  PlaygroundsMenuIcon,
  RecallMenuIcon,
  SettingsMenuIcon,
  SubscriptionsMenuIcon,
  useMatchMedia,
} from "web-shared-lib";
import useLocalStorage from "use-local-storage";

import { useStore } from "../../store";
import { useQuery } from "../../utils/router";
import { events, sources, analyticsService } from "../../libs/analyticsLib";

import { logData, compareStringVersions } from "../common/change-log";
import Recall from "../recall";
import ReaderLayout from "../editor/ReaderLayout";

import MenuButton from "./MenuButton";
import HelpMenuButton from "./HelpMenuButton";

import styles from "./Layout.module.css";

const topLogData = logData.slice(0, 3);

const selector = (state) => ({
  isRecallOpen: state.recall.isOpen,
  doRecallOpen: state.doRecallOpen,
});

function Menu({ section, isCollapsed, doRecallOpen, eventSource, hasNotifications = true }) {
  const history = useHistory();

  return (
    <div className={cn(styles.menuWrapper, { [styles.isCollapsed]: isCollapsed })}>
      <div>
        {!isCollapsed && <Logo height={36} className={styles.logo} />}
        {isCollapsed && <LogoIcon height={36} className={styles.logo} />}
        <ul className={styles.menu}>
          <li>
            <MenuButton
              icon={<HomeMenuIcon />}
              label={"Home"}
              title={"Home"}
              isActive={section === "home" || !section}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/");
                analyticsService.logEvent(events.homeOpened({ source: sources.MENU }));
              }}
            />
          </li>
          <li>
            <MenuButton
              icon={<RecallMenuIcon />}
              label={"Recall"}
              title={"Recall"}
              className={styles.menuButton}
              isCollapsed={isCollapsed}
              onClick={() => doRecallOpen({ isOpen: (prev) => !prev, eventSource: sources.MENU })}
            />
          </li>
          <li>
            <MenuButton
              icon={<DailyLogMenuIcon />}
              label={"Daily Log"}
              title={"Daily Log"}
              isActive={section === "daily-log"}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/daily-log");
                analyticsService.logEvent(events.dailyLogOpened({ source: sources.MENU }));
              }}
            />
          </li>
          <li>
            <MenuButton
              icon={<PlaygroundsMenuIcon />}
              label={"Playgrounds"}
              title={"Playgrounds"}
              isActive={section === "playgrounds"}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/playgrounds");
                analyticsService.logEvent(events.playgroundsOpened({ source: sources.MENU }));
              }}
            />
          </li>
          <li>
            <MenuButton
              icon={<LibraryMenuIcon />}
              label={"Library"}
              title={"Library"}
              isActive={section === "library"}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/library");
                analyticsService.logEvent(events.libraryOpened({ source: sources.MENU }));
              }}
            />
          </li>
          <li>
            <MenuButton
              icon={<SubscriptionsMenuIcon />}
              label={"Subscriptions"}
              title={"Subscriptions"}
              isActive={section === "subscriptions"}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/subscriptions");
                analyticsService.logEvent(events.subscriptionsOpened({ source: sources.MENU }));
              }}
            />
          </li>
          <li>
            <MenuButton
              icon={<IntegrationsMenuIcon />}
              label={"Integrations"}
              title={"Integrations"}
              isActive={section === "integrations"}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/integrations");
                analyticsService.logEvent(events.integrationsOpened({ source: sources.MENU }));
              }}
            />
          </li>
          <li>
            <MenuButton
              icon={<DownloadsIcon />}
              label={"Downloads"}
              title={"Downloads"}
              isActive={section === "downloads"}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/downloads");
                analyticsService.logEvent(events.downloadsOpened({ source: sources.MENU }));
              }}
            />
          </li>
          <li>
            <MenuButton
              icon={<SettingsMenuIcon />}
              label={"Settings"}
              title={"Settings"}
              isActive={section === "settings"}
              isCollapsed={isCollapsed}
              onClick={() => {
                history.push("/settings");
                analyticsService.logEvent(events.settingsOpened({ source: sources.MENU }));
              }}
            />
          </li>
        </ul>
      </div>
      <ul className={styles.menu}>
        <li>
          <MenuButton
            icon={hasNotifications ? <NotificationsActiveMenuIcon /> : <NotificationsMenuIcon />}
            label={"Notifications"}
            title={"Notifications"}
            className={styles.menuButton}
            size={"large"}
            isCollapsed={isCollapsed}
            isActive={section === "notifications"}
            onClick={() => {
              history.push("/notifications");
              analyticsService.logEvent(events.notificationsOpened({ source: sources.MENU }));
            }}
          />
        </li>
        <li>
          <HelpMenuButton className={styles.menuButton} isCollapsed={isCollapsed} eventSource={eventSource} />
        </li>
      </ul>
    </div>
  );
}

function sourceForSection({ section }) {
  switch (section) {
    case "home": {
      return sources.HOME;
    }
    case "daily-log": {
      return sources.DAILY_LOG;
    }
    case "playgrounds": {
      return sources.PLAYGROUND;
    }
    case "library": {
      return sources.LIBRARY;
    }
    case "subscriptions": {
      return sources.RSS_SUBSCRIPTIONS;
    }
    case "integrations": {
      return sources.INTEGRATIONS;
    }
    case "settings": {
      return sources.SETTINGS;
    }
    case "notifications": {
      return sources.NOTIFICATIONS;
    }
    default: {
      console.warn("sourceForSection: unknown section", section);
      return "UNKNOWN";
    }
  }
}

export default function Layout({ section, isMenuCollapsed, children }) {
  const history = useHistory();
  const routerQuery = useQuery();
  const artifactId = routerQuery.get("artifact");
  const { id } = useParams(); // TODO rename to playgroundId

  const isLayoutCollapsed = useMatchMedia(`(max-width: ${322 * 2 + 8 * 3}px)`);
  const isCollapsed = isMenuCollapsed || isLayoutCollapsed || !!artifactId;
  const { isRecallOpen, doRecallOpen } = useStore(selector, shallow);

  const baseContextUrls = useMemo(() => (id ? [`https://app.re-collect.ai/idea/${id}`] : []), [id]);
  const eventSource = sourceForSection({ section });
  const ref = useRef();
  const [lastAppVersion, setLastAppVersion] = useLocalStorage("changelog_version", "0");
  const hasNotifications = !!topLogData.find((log) => compareStringVersions(lastAppVersion, log.version) < 0);

  let content = children;
  if (id) {
    content = React.cloneElement(children, { ref });
  } else if (section === "notifications") {
    content = React.cloneElement(children, {
      onMount: () => {
        setTimeout(() => {
          setLastAppVersion(topLogData[0].version);
        }, 2000);
      },
      lastAppVersion,
    });
  }

  return (
    <>
      <div className={styles.Layout}>
        <div className={cn(styles.panel, styles.sidebar, { [styles.isCollapsed]: isCollapsed })}>
          <Menu
            section={section}
            isCollapsed={isCollapsed}
            doRecallOpen={doRecallOpen}
            eventSource={eventSource}
            hasNotifications={hasNotifications}
          />
        </div>
        <div className={cn(styles.panel, styles.content)}>{content}</div>
        {artifactId && (
          <div className={cn(styles.panel, styles.reader)}>
            <ReaderLayout
              documentId={id}
              artifactId={artifactId}
              eventSource={eventSource}
              onClose={() => {
                // Strip all query parameters away
                // TODO do this properly - this doesn't maintain any non-reader query params
                history.push(document.location.pathname);
              }}
              getEditor={() => (id ? ref.current : undefined)}
            />
          </div>
        )}
      </div>

      {isRecallOpen && (
        <Recall
          documentId={id}
          eventSource={eventSource}
          contextUrls={baseContextUrls}
          // We have to pass a reference to the editor imperative API to power positionining and selecting
          // kept cards. This has to be a function because the reference is not created until after render!
          getEditor={() => (id ? ref.current : undefined)}
        />
      )}
    </>
  );
}
