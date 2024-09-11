# js-shared-lib

The js library is shared between the `web-client` and `browser-extension` and it's separate from `web-shared-lib` because it doesn't include any dependencies that require a browser and can thus be imported by the extension service worker. This library includes all shared non UI code like models, API library, configuration, analytics and other common utils.

## Config

The global shared config is found at `src/config.js`. Every client has their own `config.js` file that extends this shared configuration.

## Global Lists

Global list json files are stored in this library. See main monorepo README for details on how to update them.
