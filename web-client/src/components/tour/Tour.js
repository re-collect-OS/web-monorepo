import React from "react";
import { Logo, IconButton } from "web-shared-lib";
import { useMachine } from "react-robot";
import { createMachine, state, state as final, transition } from "robot3";

import { shallow } from "zustand/shallow";
import { useHistory, Link } from "react-router-dom";

import { events, analyticsService } from "../../libs/analyticsLib";
import { useStore } from "../../store";

import apiLib from "../../libs/apiLib";
const { USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING } = apiLib;

import styles from "./Tour.module.css";

const selector = (state) => ({
  doSetAccountSetting: state.doSetAccountSetting,
  hasCompletedProductOnboarding:
    !window.forceFreshAccountStatus && !!state.user.accountSettings[USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING],
});

const machine = createMachine({
  collect: state(transition("continue", "tweets_and_youtube")),
  tweets_and_youtube: state(transition("continue", "sidecar")),
  sidecar: state(transition("continue", "gist")),
  gist: state(transition("continue", "playgrounds")),
  playgrounds: state(transition("continue", "onboarded")),
  onboarded: final(),
});

const BASE_URL = "https://recollect-ai-marketing.s3.us-east-1.amazonaws.com";

function Clip({ url }) {
  return (
    <video key={url} autoPlay loop className={styles.video}>
      <source src={url} />
    </video>
  );
}

function Content({ title, buttonLabel, buttonVariant, children, onContinue }) {
  return (
    <div className={styles.content}>
      <h1>{title}</h1>
      {children}
      <IconButton
        className={styles.button}
        type={"submit"}
        label={buttonLabel}
        title={buttonLabel}
        variant={buttonVariant || "grey"}
        size={"large"}
        onClick={onContinue}
      />
    </div>
  );
}

function renderContentForState({ state, onContinue, onGoToProduct, isOnboarding }) {
  switch (state) {
    case "collect": {
      return (
        <Content
          title="Automatically collect relevant info"
          buttonLabel={"Next: YouTube and Tweets"}
          onContinue={onContinue}
        >
          <p>
            Your re:collect extension will automatically remember articles and PDFs for you as you browse. Mark what you
            find important with highlights and notes.
          </p>
        </Content>
      );
    }
    case "tweets_and_youtube": {
      return (
        <Content title="YouTube transcripts and Tweets" buttonLabel={"Next: Sidecar"} onContinue={onContinue}>
          <p>Collect YouTube transcripts and Tweets/X posts by intentionally saving them with the extension.</p>
        </Content>
      );
    }
    case "sidecar": {
      return (
        <Content title="macOS Sidecar" buttonLabel={"Next: Gist"} onContinue={onContinue}>
          <p>
            Recall content in your re:collect account from anywhere on your desktop. Peel cards off to keep your ideas
            with you as you work.
          </p>
        </Content>
      );
    }
    case "gist": {
      return (
        <Content
          title="Gist"
          buttonLabel={"Next: Playgrounds"}
          onContinue={onContinue}
          buttonVariant="grey"
        >
          <p>
            Once you have peeled more than one card, click our “Gist” icon to get a personalized synthesis of those cards.
          </p>
        </Content>
      );
    }
    case "playgrounds": {
      return (
        <Content
          title="Playgrounds"
          buttonLabel={"Start using re:collect"}
          onContinue={onGoToProduct}
          buttonVariant="violet"
        >
          <p>
            A place to work through your big ideas. Keep track of recalled results and notes as you craft your final
            output, all within our web app.
          </p>
        </Content>
      );
    }
  }
  return `${state} is missing!`;
}


function videoFilenameForState(state) {
  switch (state) {
    case "collect": {
      return `${BASE_URL}/product_onboarding_1.mp4`;
    }
    case "tweets_and_youtube": {
      return `${BASE_URL}/product_onboarding_3.mp4`;
    }
    case "sidecar": {
      return `${BASE_URL}/product_onboarding_2.mp4`;
    }
    case "gist": {
      return `${BASE_URL}/assets.gist.onboarding.mp4`;
    }
    case "playgrounds": {
      return `${BASE_URL}/product_onboarding_4.mp4`;
    }
  }
  return `${state} is missing!`;
}

export default function Tour() {
  const { doSetAccountSetting, hasCompletedProductOnboarding } = useStore(selector, shallow);
  const history = useHistory();
  const isOnboarding = !hasCompletedProductOnboarding;
  const logo = <Logo height={36} className={styles.logo} />;

  const [current, send] = useMachine(machine);
  const state = current.name;

  return (
    <div className={styles.Tour}>
      <div className={styles.wrapper}>
        <div className={styles.leftCol}>
          <Link to="/" className={styles.logo}>
            {logo}
          </Link>
          <div className={styles.content}>
            <Clip url={videoFilenameForState(state)} />
          </div>
        </div>
        <div className={styles.rightCol}>
          {renderContentForState({
            state,
            onContinue: () => send("continue"),
            onGoToProduct: () => {
              if (isOnboarding) {
                doSetAccountSetting({ key: USER_SETTING_HAS_COMPLETED_PRODUCT_ONBOARDING });
                analyticsService.logEvent(events.onboardingHasCompletedProductOnboarding());
              }
              history.push("/");
            },
            isOnboarding,
          })}
        </div>
      </div>
    </div>
  );
}
