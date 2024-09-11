import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";
import {
  IconButton,
  LogoType,
  Menu,
  MenuItem,
  MenuTrigger,
  BellIcon,
  BellNotificationIcon,
  SmallCrossIcon,
  Toolbar,
} from "web-shared-lib";

import styles from "./NavBar.module.css";

function NavBar({
  username,
  className,
  hasNotifications,
  onLogout,
  onClose,
  onLaunchApp,
  onShowNotifications,
  menuContainer,
}) {
  return (
    <Toolbar.Root className={cn(className, styles.NavBar)} aria-label="Navigation">
      <div className={styles.logoButtonWrapper}>
        <Toolbar.Button className={cn(styles.buttonSegment, styles.logoButton)} onClick={onLaunchApp}>
          <LogoType height={20} />
        </Toolbar.Button>
        <div className={styles.logoButtonSeparator} />
        <MenuTrigger
          modal={false}
          button={
            <Toolbar.Button className={cn(styles.buttonSegment, styles.logoButtonMenuTrigger)}>
              <svg width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8.5L11 12.5L7 8.5" stroke="#333333" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Toolbar.Button>
          }
          menuContent={
            <Menu
              align="start"
              side="bottom"
              sideOffset={0}
              alignOffset={-8}
              avoidCollisions={false}
              container={menuContainer}
            >
              <MenuItem textValue="edit" title={username} onSelect={() => onLogout()}>
                Log out
              </MenuItem>
            </Menu>
          }
        />
      </div>
      <Toolbar.Button asChild>
        <IconButton
          type={"button"}
          title={"Go to Notifications"}
          icon={hasNotifications ? <BellNotificationIcon /> : <BellIcon />}
          onClick={onShowNotifications}
        />
      </Toolbar.Button>
      <div className={styles.flex} />
      <Toolbar.Button asChild>
        <IconButton type={"button"} title={"Dismiss"} icon={<SmallCrossIcon />} onClick={onClose} />
      </Toolbar.Button>
    </Toolbar.Root>
  );
}

NavBar.propTypes = {
  className: PropTypes.string,
  hasNotifications: PropTypes.bool.isRequired,
  menuContainer: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onLaunchApp: PropTypes.func.isRequired,
  onShowNotifications: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  username: PropTypes.string.isRequired,
};

export default NavBar;
