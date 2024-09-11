# web-shared-lib

The web "components" library is shared between the `web-client` and `browser-extension` and it's separate from `js-shared-lib` because it has all shared dependencies that require a browser (like React) and it would prevent sharing code with the extension service worker. Shared components and hooks are here as well as proxied shared components like `@radix-ui` components to prevent getting into the situation where we have multiple versions of the same dependencies installed.

## Icon Library

Icons are all SVG files inlined into `web-shared-lib/src/components/icons/index.js` with some exceptions like the logo.

### How to find an icon

To find an icon component visually you can see a dynamically generated library by visiting [/internal/icons](http://localhost:3000/internal/icons).

### How to add a new icon

The majority are from systemuicons.com but the names do not match one to one. The process to add a new icon is copying the source SVG source and creating a new component in the `icon/index.js` file that gets auto exported by the `web-shared-lib` library. Follow the existing patterns to create the component:

```
export const MyNewIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m8.5.5c2.7614237 [...] 4.90031148-4.00162508z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
MyNewIcon.displayName = "NewIcon";

// This will be available in other components by importing it from web-shared-lib:

import { MyNewIcon } from "web-shared-lib";
```

Note that any svg properties with a dash have to be manually converted to camel case (ex: `stroke-line-cap` becomes `strokeLinecap`). In practice this inconvenience is minor and it means we don't have a build step to convert SVGs etc.

Also note all colors are manually replaced to value `currentColor` unless otherwise desired. This makes it so the SVG inherits the text color in context (say a button).
