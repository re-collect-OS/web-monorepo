# re:collect web-client

## Node environment

```sh
nvm use
# or - if not installed:
nvm install
```

## Dependencies

Make sure you have all dependencies installed and up to date. It's important you run this script instead of a simple `npm install` because this project shares code with the extension via two libraries: `js-shared-lib` and `web-shared-lib` that have their own dependencies that need to be updated!

```sh
npm run install:dependencies
```

## Config

The client config is found at `src/config.js`

## Build

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

## Deploy

We auto-deploy to both dev and prod as soon as changes are pushed to the remote branches. So releasing to dev is as simple as pushing or merging commits into the `dev` branch.

To push to production simply check out the latest `main` branch and git merge the latest `dev` branch. Push.

Follow build status: https://app.netlify.com/sites/confident-meitner-bd8652/overview

### Deployment targets

Our branches match the deployment target so pushing to any of these branches will auto deploy the client with a specific configuration that either points to the prod or dev service. Besides the `prod` and `dev` branch we also have a `demo` and `wip` branch which are used when we want to test some work in progress but not disturb an exising feature test or production system.

- prod: `app.re-collect.ai`: prod client, prod service
- demo: `demo.app.re-collect.ai`: work in progress client, prod service
- dev: `dev.app.re-collect.ai`: release candidate client, dev service
- wip: `wip.app.re-collect.ai`: work in progress client, dev service

`demo` and `wip` are not branches we push code to explicitly, we simply reset their head to any branch we want deployed. You choose either `demo` or `wip` depending on what backend service you want to point this client to: `prod` or `dev` respectively:

```sh
git checkout wip

git reset --hard any-branch

git push origin wip -f
```

The code on the `any-branch` branch will be deployed and made available at `wip.app.re-collect.ai` where you can log in with your dev credentials.

## Testing Netlify functions

Make sure you have Netlify cli installed globally: https://docs.netlify.com/cli/get-started/

```
npm install netlify-cli -g
```

We make use of Netlify serverless functions for some small functionality. To develop / test the functions start the app with:

```sh
netlify dev
```

This will build and run a netlify web server (:3000) that proxies our app (:8000) pointing to the dev environment.

Functions are vailable in the `netlify-lambda` folder and are currently:

- `sendmail` is used by the feedback dialog to send the user feedback as email to us
- `version` is pinged by web clients occasionally to check if there's an updated version of the app available. This doesn't take into account the app version but the hash of the deployed commit (automatically updates on deploy - see `netlify.toml`)

## Scripts

Sync global go list (run from web-client root folder)

```sh
npm run sync-global-go-list
```

## Update change log

The change log is just another React component found under `src/components/common/change-log`

If you add to the change log you MUST bump the version in `package.json` or clients won't notify customers that there was a new announcement.

## CSP

We had to add [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) because of a security audit.
If you see a warning related to the CSP configuration you can find it in `public/index.html`. It has a hardcoded nounce that needs to match the webpack configuration so careful with that. It's not the ideal setup - the nonce should change on every request but it is what it is. 

## Tips and tricks

### Debug mode

Development builds (not to be mistaken with builds pointing to dev (staging) server deployment) are always in debug mode and will print debug statements to console. To get this in prod you can add a `?debug` url parameter.

When debug mode is enabled the application store injects some global functions you can use to dump application state for debugging purposes:

- `window.getState()` will dump the application state tree
- `window.getLiveState()` will dump the application live state tree - this is state related to interaction state like the canvas camera
- `window.resetAllStores()` will reset all store data
- `window.clearCache()` will reset the application cache which currently is a thumbnail image cache

See `store.js` for additional documentation and implementation.

### Other internal tricks and tips

In conjuction with debug mode you can pass additional flags on specific screens to set the app in a specific state.

- `/echo` will print out the authorization token for your current session. Useful if you want to manually trigger an API call.
- `/integrations/twitter?debug` if you view any integration under debug mode you'll see a button to trigger sync immediately.
- `/welcome?debug&fresh&dry` will get you an onboarding flow that simulates a fresh onboarding. You can combine parameters. Leave out the `dry` param if you want to submit data to server. Leave out `fresh` param if you only want to test a "dry" add more data flow.
- `/?fresh&debug` will get you a home base (dashboard) that simulates a fresh onboarding.
- `/settings/prefs` will render a hidden feature toggle page. Note the two sets of prefs are `local` and `account settings`. Local prefs are client only feature toggles defined in the prefs slice in `store.js`. Account Settings on the other hand will persist back to the server. Note they too need a representation in the `accountSettings` key in `store.js` or they will not show up in the list even if added from the server side.
- `/library/debug` will get you a version of the library that shows everything on the server not just successfully processed artifacts. This is the old version of the library that we replaced but it's useful for debugging purposes so we kept it around. It's not technically related to the debug mode so the naming is confusing.

### Internal tools

We have a few tools that are meant for internal admin use and most require admin credentials:

- `/internal/stats` will render a list of system stats that's useful to get a birds eye view of the backend state.
- `/internal/invitations` gives you a way to create and check status of an invitation to onboard.
- `/internal/accounts` gives you a list of all active accounts in the system as well as tools to manipulate and get statistics about each account.
- `/internal/icons` gives you a list of all available icons.
