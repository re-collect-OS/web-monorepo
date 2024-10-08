# web-monorepo


Open Source monorepo for re:collect web clients

Requirements:

-   installing nvm globally: https://github.com/nvm-sh/nvm#installing-and-updating

## Bootstrap environment

Symlinks allow us to share one environment between the two clients:

```
cp .env.sample .env
ln -s ../.env web-client/.env
ln -s ../../.env browser-extensions/chrome/.env
```

Update the values:

-   `LOCAL_COGNITO_USERPOOL_ID` and `LOCAL_COGNITO_APP_CLIENT_ID`: Get from `.env` in `k8s-backend` repo after you run `setup_local_dev.sh`. This is optional and only used if you want to point your clients to the local backend with `npm run start:local`
-   `SENTRY_AUTH_TOKEN` can be retreived from Sentry.io

## web-client

Build docs: https://github.com/re-collect-OS/web-monorepo/blob/main/web-client/README.md

Concepts: https://github.com/re-collect-OS/web-monorepo/blob/main/web-client/docs/concepts.md

## extension

Build docs: https://github.com/re-collect-OS/web-monorepo/blob/main/browser-extensions/chrome/README.md

Concepts: https://github.com/re-collect-OS/web-monorepo/blob/main/browser-extensions/chrome/docs/concepts.md

## web-shared-lib

Docs: https://github.com/re-collect-OS/web-monorepo/blob/main/web-shared-lib/README.md

## js-shared-lib

Docs: https://github.com/re-collect-OS/web-monorepo/blob/main/js-shared-lib/README.md

