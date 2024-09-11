import React, { useState, useRef, useEffect } from "react";
import cn from "classnames";
import { IconButton, Logo, BoxIcon, CheckBoxIcon, LoadingIndicator } from "web-shared-lib";
import { Link } from "react-router-dom";
import { shallow } from "zustand/shallow";

import { pingChromeExtension, extensionId } from "../../libs/chromeExtensionLib";
import { events, analyticsService } from "../../libs/analyticsLib";
import apiLib from "../../libs/apiLib";
const { ACCOUNT_STATUS_READY, ACCOUNT_STATUS_ONBOARDED } = apiLib;

import { useStore } from "../../store";

// import pinSrc from "./images/pin.png";

import styles from "./Steps.module.css";

const selector = (state) => ({
  isAccountActive: !window.forceFreshAccountStatus && state.user.accountStatus === ACCOUNT_STATUS_READY,
  isAccountOnboarded:
    !window.forceFreshAccountStatus &&
    [ACCOUNT_STATUS_ONBOARDED, ACCOUNT_STATUS_READY].includes(state.user.accountStatus),
});

function Step({ children, hasFixedNav = false }) {
  const { isAccountActive } = useStore(selector, shallow);
  const logo = <Logo height={36} className={styles.stepLogo} />;

  return (
    <div className={styles.Step}>
      <div className={styles.header}>
        <div className={styles.leftCol}>{isAccountActive ? <Link to={"/"}>{logo}</Link> : logo}</div>
      </div>
      <div className={cn(styles.stepContentWrapper, { [styles.hasFixedNav]: hasFixedNav })}>
        <div className={styles.stepContent}>{children}</div>
      </div>
    </div>
  );
}

function StepNav({ children }) {
  return <div className={styles.stepInlineNav}>{children}</div>;
}

function StepNavColumn({ children }) {
  return <div className={styles.stepColumnNav}>{children}</div>;
}

function NavIconButton(props) {
  return <IconButton className={styles.navButton} variant={"grey"} size={"large"} full {...props} />;
}

var isIPadPro = /Macintosh/.test(navigator.userAgent) && "ontouchend" in document; // touch Safari
const isMobile = /android|mobi|ipad|tablet|(android(?!.*mobile))/i.test(navigator.userAgent) || isIPadPro;

export function IntroStep({ name, onContinue, onSkip, onOpenProduct, canInstallExtension, ...rest }) {
  const [hasExtension, setHasExtension] = useState(null);
  const { isAccountActive: accountIsReady, isAccountOnboarded: hasOnboarded } = useStore(selector, shallow);

  const isMounted = useRef(true);
  useEffect(() => () => (isMounted.current = false), []);

  useEffect(() => {
    if (!canInstallExtension) return;

    pingChromeExtension(extensionId)
      .then(() => {
        if (isMounted.current) setHasExtension(true);
      })
      .catch(() => {
        if (isMounted.current) setHasExtension(false);
      });
  }, [canInstallExtension]);

  useEffect(() => {
    analyticsService.logEvent(
      events.onboardingFlowStarted({
        canInstallChromeExtension: canInstallExtension,
        hasOnboarded,
        accountIsReady,
        isMobile,
      })
    );
  }, [canInstallExtension, hasOnboarded, accountIsReady]);

  const needsExtension = !hasExtension && canInstallExtension;

  const browserNote = !canInstallExtension ? (
    <p className={styles.browserNote}>
      Note: the re:collect browser extension currently only supports Chromium-based browsers like Google Chrome, Arc,
      Microsoft Edge{" "}
      <a
        href="https://en.wikipedia.org/wiki/Chromium_(web_browser)#Browsers_based_on_Chromium"
        target="_blank"
        rel="noreferrer"
      >
        and more
      </a>
      . Please try a supported browser.
    </p>
  ) : null;

  if (isMobile) {
    return (
      <Step {...rest}>
        <h1>Try later from your computer</h1>
        <p>Onboarding is currently only available from desktop / laptop computers. Sorry for the inconvenience!</p>
        {browserNote}
      </Step>
    );
  }

  if (accountIsReady) {
    return (
      <Step {...rest}>
        <h1>We’re excited to have you onboard!</h1>
        <p>
          You’re onboarded and your account is active. Feel free to step through the flow again and add more data or
          head back to re:collect.
        </p>
        {browserNote}
        <StepNav>
          <NavIconButton label={"Go back to re:collect"} onClick={onOpenProduct} title="Go back to re:collect" />
          <NavIconButton
            label={"Add more data"}
            variant={"violet"}
            onClick={needsExtension ? onContinue : onSkip}
            title="Add more data"
          />
        </StepNav>
      </Step>
    );
  }

  if (hasOnboarded && !accountIsReady) {
    return (
      <Step {...rest}>
        <h1>We’re still on it</h1>
        <p>
          We’re still working on processing your data. Look for an email from us when your account is ready. We’re
          excited to have you onboard soon!
        </p>
        {browserNote}
        <StepNav>
          <NavIconButton
            label={"Add more data"}
            onClick={needsExtension ? onContinue : onSkip}
            variant={"violet"}
            title="Add more data"
          />
        </StepNav>
      </Step>
    );
  }

  return (
    <Step {...rest}>
      {name && <h1>Welcome, {name}</h1>}
      {!name && <h1>Welcome</h1>}
      <p>
        <strong>Accessing your information should feel as effortless as thought.</strong>
      </p>
      <p>With re:collect you can recall whatever you’re thinking wherever you need it.</p>
      {browserNote}
      {/*      <div className={styles.stepNavHeader}>
        <p>Let’s get your re:collect account set up. We’ll walk you through the following:</p>
        <ul className={styles.todoList}>
          <li className={cn({ [styles.isDone]: hasExtension, [styles.notSupported]: !canInstallExtension })}>
            Installing the browser extension
          </li>
          <li>Importing what you’ve previously read</li>
          <li>Submitting your data</li>
        </ul>
      </div>
*/}
      <StepNav>
        <NavIconButton
          variant={"violet"}
          label={"Let’s go"}
          disabled={!canInstallExtension}
          onClick={needsExtension ? onContinue : onSkip}
          title="Let’s go"
        />
      </StepNav>
    </Step>
  );
}

export function InstallExtensionStep({ error, isInstalling, onContinue, onSkip, ...rest }) {
  return (
    <Step {...rest}>
      <h1>Let’s get you set up</h1>
      <>
        <p>The browser extension is the primary way to bring the information you consume into re:collect.</p>
      </>
      {error && (
        <div className={styles.error}>
          {error.message}. Please try again and{" "}
          <a href="mailto:hello@re-collect.ai?subject=Help" target="_blank" rel="noopener noreferrer">
            get in touch
          </a>{" "}
          if the problem persists.
        </div>
      )}
      <StepNav>
        <NavIconButton
          disabled={!!isInstalling}
          label={isInstalling ? "Waiting for extension..." : "Install extension"}
          onClick={() => (error ? onContinue(false) : onContinue(true))} // skip installer if we’re in an error state (timeout is not an error state)
          title={isInstalling ? "Waiting for browser extension..." : "Open popup to install browser extension"}
          variant="violet"
        />
        {!isInstalling && (
          <NavIconButton
            label={"Skip this step"}
            onClick={onSkip}
            title={"Skip this step"}
            style={{ display: "none" }}
          />
        )}
      </StepNav>
      {/*      <div style={{ marginTop: 20 }}>
        <p>We recommend pinning the extension so you can see what’s coming into your re:collect account.</p>
        <img src={pinSrc} style={{ width: 377 }} />
      </div>
      */}
    </Step>
  );
}

export function ImportStep({ canInstallExtension, error, isSubmitting, onContinue, skippedExtensionInstall, ...rest }) {
  const { isAccountOnboarded } = useStore(selector, shallow);

  const [hasHistory, setHasHistory] = useState(true);
  const [hasBookmarks, setHasBookmarks] = useState(false);

  const hasAll = hasHistory && hasBookmarks;
  const hasAny = hasHistory || hasBookmarks;

  const errorBanner = error ? (
    <div className={styles.error}>
      {error.message}. Please try again and{" "}
      <a href="mailto:hello@re-collect.ai?subject=Help" target="_blank" rel="noopener noreferrer">
        get in touch
      </a>{" "}
      if the problem persists.
    </div>
  ) : null;

  return (
    <Step {...rest}>
      <h1>Bring in what you’ve already read</h1>
      <p>Choose the sources you’d like us to access to jumpstart what you have in your re:collect account.</p>
      <details>
        <summary>Important note on privacy</summary>
        <p>
          At re:collect, we are committed to the privacy and security of your personal information. We do not share or
          sell your data with third parties. We automatically exclude sites with personal and sensitive information. See
          our{" "}
          <a href="https://www.re-collect.ai/privacy" target="_blank" rel="noopener noreferrer">
            privacy policy
          </a>{" "}
          for more information.
        </p>
      </details>

      {errorBanner}

      {!isSubmitting && (
        <StepNavColumn>
          {canInstallExtension && (
            <>
              <IconButton
                icon={hasHistory ? <CheckBoxIcon /> : <BoxIcon />}
                label={"Historical articles (recommended)"}
                title={"Import articles and PDFs from your browser history"}
                onClick={() => setHasHistory((prev) => !prev)}
                disabled={skippedExtensionInstall || isSubmitting}
                variant={"grey"}
                size={"large"}
              />
              <IconButton
                icon={hasBookmarks ? <CheckBoxIcon /> : <BoxIcon />}
                label={"All bookmarks"}
                title={"Import articles and PDFs from your browser bookmarks"}
                onClick={() => setHasBookmarks((prev) => !prev)}
                disabled={skippedExtensionInstall || isSubmitting}
                variant={"grey"}
                size={"large"}
              />
            </>
          )}
        </StepNavColumn>
      )}

      {isSubmitting && (
        <div className={styles.submitLoadingMessage}>
          <div className={styles.loadingIndicatorWrapper}>
            <LoadingIndicator />
          </div>
          <p>This may take a while, please don't reload the page.</p>
        </div>
      )}

      <StepNav>
        <NavIconButton
          label={
            isSubmitting
              ? "Submitting..."
              : hasAny
              ? hasAll
                ? "Continue"
                : "I’m done, continue"
              : "Start from scratch"
          }
          title={
            isSubmitting
              ? "Submitting..."
              : hasAny
              ? hasAll
                ? "Continue"
                : "I’m done, continue"
              : "Start from scratch"
          }
          onClick={() => onContinue({ wantsBookmarkSync: hasBookmarks, wantsHistorySync: hasHistory })}
          disabled={isSubmitting || (!hasAny && isAccountOnboarded)} // don't allow continuing with no data if already onboarded
          variant={hasAll ? "violet" : "grey"}
        />
      </StepNav>
    </Step>
  );
}

export function FinishedStep({ totalImported, onOpenProduct, onAddMoreData, onOpenTour, ...rest }) {
  const needsMore = !totalImported;
  let title = needsMore ? "Just one more thing!" : "Welcome to re:collect!";

  return (
    <Step {...rest}>
      <h1>{title}</h1>
      {!needsMore && <p>You’re one step closer to ideating and creating with re:collect.</p>}
      {needsMore && (
        <p>
          You decided not to add data when creating your re:collect account. To make use of our Recall functionality
          you’ll need to visit the places you read from most. That’ll allow our browser extension to collect some of
          your favorite articles to power Recall.
        </p>
      )}
      <StepNav>
        <NavIconButton
          label={"See what re:collect can do"}
          title={"See what re:collect can do"}
          onClick={onOpenTour}
          variant={"violet"}
        />
        {needsMore && <NavIconButton label={"Add more data"} title={"Add more data"} onClick={onAddMoreData} />}
        {!needsMore && (
          <NavIconButton label={"Continue to re:collect"} title={"Continue to re:collect"} onClick={onOpenProduct} />
        )}
      </StepNav>
    </Step>
  );
}
