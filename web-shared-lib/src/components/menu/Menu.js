import React from "react";
import cn from "classnames";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import styles from "./Menu.module.css";

export default function Menu({ className, children, container, ...props }) {
  const content = (
    <DropdownMenu.Content className={cn(styles.Menu, className)} {...props}>
      {children}
    </DropdownMenu.Content>
  );

  if (!container) return content;

  return <DropdownMenu.Portal {...(container ? { container } : {})}>{content}</DropdownMenu.Portal>;
}
