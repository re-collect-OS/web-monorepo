export { default as IconButton } from "./components/icon-button";
export * from "./components/icon-picker-button";
export * from "./components/icons";
export { default as Logo } from "./components/logo";
export { default as LogoIcon } from "./components/logo-icon";
export { default as LogoType } from "./components/logo-type";
export * from "./components/menu";
export { default as Switch } from "./components/switch";
export { default as CompactSwitch } from "./components/compact-switch";
export { default as LoadingIndicator } from "./components/loading-indicator";
export * from "./libs/hooksLib";
export { default as FallbackAvatar } from "./components/fallback-avatar";
export * from "./components/recall";
export * from "./components/card";
export { default as Thumbnail } from "./components/thumbnail";

// Re-export primitive Radix components:
// Note: We were having problems with adding these dependencies directly in the
// invidual projects because the core libs get loaded twice (as of v1.0.0).
// Observable bugs: stuck pointer-events: none on body tags when dismissing a
// programatically presented dialog.
import * as Dialog from "@radix-ui/react-dialog";
import * as Toolbar from "@radix-ui/react-toolbar";
import * as Toast from "@radix-ui/react-toast";
import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";

export { Dialog, Toolbar, Toast, Tabs, Tooltip };
