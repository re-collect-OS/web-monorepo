import React, { forwardRef } from "react";
import cn from "classnames";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import styles from "./MenuItem.module.css";

const MenuItem = forwardRef(({ className, variant, children, icon, endIcon, ...props }, ref) => {
  return (
    <DropdownMenu.Item
      className={cn(styles.MenuItem, className, {
        [styles.isDestructive]: variant === "destructive",
        [styles.isViolet]: variant === "violet",
      })}
      {...props}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{children}</span>
      {endIcon && <span className={cn(styles.icon, styles.isEndIcon)}>{endIcon}</span>}
    </DropdownMenu.Item>
  );
});

export default MenuItem;

export const VisualMenuItem = forwardRef(
  ({ as: Component = "button", className, variant, children, icon, endIcon, textValue, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(styles.MenuItem, className, { [styles.isDestructive]: variant === "destructive" })}
        title={textValue}
        {...props}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.label}>{children}</span>
        {endIcon && <span className={cn(styles.icon, styles.isEndIcon)}>{endIcon}</span>}
      </Component>
    );
  }
);

export function MenuItemSeparator({ className, ...props }) {
  return <DropdownMenu.Separator className={cn(styles.MenuItemSeparator, className)} {...props} />;
}

export function MenuItemInput({ className, ...props }) {
  return (
    <DropdownMenu.Label className={cn(styles.MenuItemInput, className)}>
      <input type={"text"} {...props} />
    </DropdownMenu.Label>
  );
}
