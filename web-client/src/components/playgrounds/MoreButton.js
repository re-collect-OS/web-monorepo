import React from "react";
import cn from "classnames";

import { MenuTrigger, MenuHorizontalIcon } from "web-shared-lib";

import styles from "./MoreButton.module.css";

const MoreButton = React.forwardRef(({ open, onOpenChange, className, menuContent, ...props }, ref) => {
  return (
    <MenuTrigger
      ref={ref}
      open={open}
      onOpenChange={onOpenChange}
      button={
        <button className={cn(styles.MoreButton, className)} {...props}>
          <MenuHorizontalIcon />
        </button>
      }
      menuContent={menuContent}
    />
  );
});

export default MoreButton;
