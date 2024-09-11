import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";

import { SmallCrossIcon } from "../icons";
import { MenuTrigger } from "../menu";
import IconButton from "../icon-button";

import styles from "./IconPickerButton.module.css";

export const IconMenuTriggerButton = React.forwardRef(
  ({ className, menuContent, icon, title, label, ...props }, ref) => {
    return (
      <MenuTrigger
        modal={false}
        button={<IconButton ref={ref} className={className} icon={icon} label={label} title={title} {...props} />}
        menuContent={menuContent}
      />
    );
  }
);

IconMenuTriggerButton.propTypes = {
  className: PropTypes.string,
  icon: PropTypes.element,
  menuContent: PropTypes.element.isRequired,
  label: PropTypes.string,
  title: PropTypes.string.isRequired,
};

const IconPickerButton = React.forwardRef(
  ({ className, onClick, menuContent, icon, pickerIcon, title, pickerTitle, label, ...props }, ref) => {
    return (
      <div className={cn(className, styles.IconPickerButton)}>
        <IconButton
          ref={ref}
          className={styles.segment}
          icon={icon}
          onClick={onClick}
          title={title}
          label={label}
          {...props}
        />
        <IconMenuTriggerButton
          className={styles.segment}
          icon={pickerIcon}
          title={pickerTitle}
          menuContent={menuContent}
          {...props}
        />
      </div>
    );
  }
);

IconPickerButton.propTypes = {
  className: PropTypes.string,
  icon: PropTypes.element,
  pickerIcon: PropTypes.element.isRequired,
  menuContent: PropTypes.element.isRequired,
  label: PropTypes.string,
  title: PropTypes.string.isRequired,
  pickerTitle: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default IconPickerButton;
