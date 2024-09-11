import React from "react";
import cn from "classnames";
import { Tooltip } from "web-shared-lib";

import styles from "./MenuButton.module.css";

const MenuButton = React.forwardRef(
  ({ icon, label, title, className, onClick, isActive, isCollapsed, isNew, ...rest }, ref) => {
    const button = (
      <button
        ref={ref}
        className={cn(styles.MenuButton, className, { [styles.isActive]: isActive, [styles.isCollapsed]: isCollapsed })}
        title={title}
        onClick={onClick}
        {...rest}
      >
        <div className={styles.icon}>{icon}</div>
        {!isCollapsed && <div className={styles.label}>{label}</div>}
        {!isCollapsed && isNew && <div className={styles.isNewIndicator}>NEW</div>}
      </button>
    );

    if (!isCollapsed) {
      return button;
    }

    return (
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={200}>
          <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className={styles.TooltipContent} sideOffset={8} side={"right"} avoidCollisions={false}>
              {label}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }
);

export default MenuButton;
