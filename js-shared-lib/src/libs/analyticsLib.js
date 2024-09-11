function debugLog(debug, enabled, message, payload = "", userId) {
  if (debug) {
    console.info(
      `%c  @AMPLITUDE${userId ? `[${userId}]` : ""} ${message} ${enabled ? "" : "(disabled)"} `,
      "background: lightgrey; color: black",
      payload
    );
  }
}

export function amplitudeEvent(eventName, eventProperties) {
  return {
    amplitude: {
      eventName,
      eventProperties,
    },
  };
}

export function initAmplitudeInstance({ instance, key, platform }) {
  instance.init(key, null, { platform });
}

export async function canConnectToAmplitude() {
  try {
    const resp = await fetch("https://api.amplitude.com", { method: "HEAD" });
    // Detect uBlock Origin (fakes? HEAD request by redirecting to "data:text/plain;base64,Cg==")
    if (resp.redirected && resp.status === 200) {
      return false;
    }
    // Otherwise can probably connect
    return true;
  } catch (_) {
    // Detect Brave
    // noop
  }

  return false;
}

export class AnalyticsService {
  constructor({ amplitude, key, debug, enabled, platform }) {
    this.debug = debug;
    this.enabled = enabled;
    this.amplitude = amplitude;
    this.amplitudeInstance = this.amplitude.getInstance();
    this.log = debugLog.bind(null, debug, enabled);

    if (enabled) {
      initAmplitudeInstance({ instance: this.amplitudeInstance, key, platform });
    }
  }

  setUserId(userId) {
    this.log("SET USER ID", { userId });
    this.amplitudeInstance.setUserId(userId);
  }

  getUserId() {
    this.log("GET USER ID");
    return this.amplitudeInstance.getUserId();
  }

  regenerateDeviceId() {
    this.log("REGENERATE DEVICE ID");

    this.amplitudeInstance.regenerateDeviceId();
  }

  // add increments a user property by some numerical value. If the user property does not have a value set yet, it
  // will be initialized to 0 before being incremented.
  addToUserProperty({ propertyName, value }) {
    this.log("ADD TO USER PROPERTY", { propertyName, value });

    if (!this.enabled) {
      return;
    }

    const identify = new this.amplitude.Identify();
    identify.add(propertyName, value);
    this.amplitudeInstance.identify(identify);
  }

  // set sets the value of a user property. You can also chain together multiple set calls.
  setUserProperty({ propertyName, value }) {
    this.log("SET USER PROPERTY", { propertyName, value });

    if (!this.enabled) {
      return;
    }

    const identify = new this.amplitude.Identify();
    identify.set(propertyName, value);
    this.amplitudeInstance.identify(identify);
  }

  // setOnce sets the value of a user property only once. Subsequent calls using setOnce will be ignored.
  setOnceUserProperty({ propertyName, value }) {
    this.log("SET USER PROPERTY ONCE", { propertyName, value });

    if (!this.enabled) {
      return;
    }

    const identify = new this.amplitude.Identify();
    identify.setOnce(propertyName, value);
    this.amplitudeInstance.identify(identify);
  }

  logEvent(event) {
    if (!event.amplitude) {
      console.warn("logAnalyticsEvent: unhandled event type", event);
      return;
    }

    this.log("EVENT", event.amplitude, this.amplitudeInstance.getUserId());

    if (!this.enabled) {
      return;
    }

    const { eventName, eventProperties } = event.amplitude;
    this.amplitudeInstance.logEvent(eventName, eventProperties);
  }
}
