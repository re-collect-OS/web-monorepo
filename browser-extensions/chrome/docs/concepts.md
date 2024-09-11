# Browser extension concepts

As this project shares a lot of code with the `web-client` project make sure you've read the concepts docs for that project first.

## Manifest

The minimal viable browser extension is a manifest file. The manifest file is what bootstraps the whole project and specifies `content_scripts` and `background service_worker` as well as permissions and other configuration. The options are [very well documented](https://developer.chrome.com/docs/extensions/reference/manifest).

Note that this is a manifest v3 project which has some limitations but not for the kind of things we have needed so far.

Files of interest are `manifest.json`

## Background service-worker

The service worker is a background script that acts as the extension's main event handler. This is the core of the project and handles all system events, authentication, remote API calls, persistance, re-injecting content scripts. When you think of "the extension" you should think of this service worker.

There is only one background-service worker per browser.

Files of interest are `background.js` and `manifest.json`

## Content Script

The content script is a javascript file that's injected in newly open tabs. This bootstraps the UI rendering process and injects all event handlers we need to do the things we do.

The UI is a React 16 application that shares some components with the `web-client` project. Besides our main popover UI we also handle highlighting in page and rendering a annotation UI in place around a highlight.

There is logic to manually inject the content script on load as otherwise would not have our content script injected into existing open tabs when the extension was installed. See `injectContentScriptForOpenTabs` in `background.js`.

Files of interest are `content.js`

## Framed Popover

Because our React app is getting injected into a foreign tab we have to isolate our code from the host page. We do this by rendering our app inside an iframe. It's tricky enough that we delegate to a dependency for this called [react-frame-component](https://www.npmjs.com/package/react-frame-component). There is still a fair amount of code to load and inject the CSS in the iframe as well as to handle resizing the iframe to fit the contents as a lot of our UI is a popover that doesn't have a fixed height (and iframes are fixed height by default).

## Highlighting in page

Part of the functionality we offer is the ability to highlight text in the host page and inject a highlight. The highlight is re-created when the user revisits the page. This means we must match a string of text back into the page and inject a colored span to highlight the text. To do this we record some of the surrounding text to make sure we don't highlight the wrong text later.

Files of interest are `highlight.js`

## Store

This is a simple Zustrand store set up much like the one in `web-client`. The only mental hurdle is that the content script initializes the store so that means every tab our extension is injected in has an instance of this store. The background service-worker does not have a reference to the store directly.

## Readability

We use [readability.js](https://github.com/mozilla/readability) to detect if a tab is an article or not. It's not always correct but we haven't changed it so you should know it's happening. The server doesn't use the same heuristic so there's a good case to be made for changing how this works.

Files of interest are `Readability-readerable.js`

## Messages

The content script app cannot make authenticated API calls and it cannot access the local storage or background service-worker directly. The way this communication happens is through message passing. The interface for this is what we call `contentLib`.

Files of interest are `contentLib.js` and `chrome.runtime.onMessage.addListener` in `background.js`

## External Messages

External messages are messages to the background service worker sent by the `web-client`. We use this communication channel to share auth tokens with the extension, sync history and bookmarks, sync user data when we know it changed on one end etc.

Files of interest are `chrome.runtime.onMessageExternal.addListener` in `background.js` and `chromeExtensionLib.js` in the `web-client` project.
