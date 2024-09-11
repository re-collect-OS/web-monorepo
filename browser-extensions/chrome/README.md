# re:collect Google Chrome extension

## Node environment

```sh
nvm use
# or - if not installed:
nvm install
```

## Dependencies

Make sure you have all dependencies installed and up to date. It's important you run this script instead of a simple `npm install` because this project shares code with the web-client via two libraries: `js-shared-lib` and `web-shared-lib` that have their own dependencies that need to be updated!

```sh
npm run install:dependencies
```

## Config

The client config is found at `src/config.js`

## Development build

(puts distribution in ./dist)

Development hot loaded build pointing to dev:

```sh
npm run start:dev
```

Development hot loaded build pointing to prod:

```sh
npm run start:prod
```

Development hot loaded build pointing to localhost:

Make sure that you have a root `.env` file with the appropriate local cognito configuration (see `.env.sample`)

```sh
npm run start:local
```

## Testing

Visit [chrome://extensions](chrome://extensions) to load the unpacked extension. Point it to the `dist` folder. Make sure developer mode is enabled if you don't see an option to load the extension manually.

Note that while the build hot reloads, the browser does not. So it still requires going back to the extension details and clicking "Update" manually which will reload the extension service worker and re-inject the content script in all open tabs.

Content script logs will print in the host tab console. Background logs will print in the extension service worker console that you can open from the extension details. This takes some getting used to as the distinction may not always be obvious. The rule of thumb is if it's UI related it will be injected into the tab via content scripts and eveyrthing else is the extension service worker which you can think of as the extension itself.

Important to realize that the content scripts cannot make authenticated calls to our backend directly so almost everything is proxied through the service worker! This means you could run what looks like an API call from the UI but you won't see anything in the network tab of that page. That's because what actually happened is the FE made a call to the service worker which then made a call to the server and the response gets passed back the same way. `contentLib.js` is the layer that abstracts this behavior.

## Internal build

(puts distribution in ./latestBuild.zip)

Unpacked build pointing to dev:

```sh
STAGE=dev make build
```

Unpacked build pointing to prod:

```sh
STAGE=prod make build
```

Currently internal builds are distributed via Google Drive (team should have editor access). Just drop the build artifact zip file into the correct folder following the naming convention:

Prod build: copy `latestBuild.zip` to `https://app.re-collect.ai/internal/prod-extension`

Dev build: rename and copy `latestBuild.dev.zip` to `https://app.re-collect.ai/internal/dev-extension`

## Chrome App Store release

First make sure to increment the application version in both `public/manifest.json` as well as in `package.json`

Commit this change with commit message `Bump extension v{0.x.x}`

Build using special release flag in order to remove the manifest key (re-injected by Chrome App Store):

```sh
STAGE=prod APP_STORE_BUILD=1 make build
```

Upload the `latestBuild.zip` artifact for review: `https://chrome.google.com/webstore/devconsole/125c7856-1ce3-49c5-a9a8-f0d4cc2b5c29?hl=en` (log in via shared `dev@re-collect.ai` account)

Note that uploading the binary does not submit for review. You have to explicitly submit the draft release. Review can take up to 24 hours on average.
