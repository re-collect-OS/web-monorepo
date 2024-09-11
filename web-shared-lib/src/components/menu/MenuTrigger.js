import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const MenuTrigger = forwardRef(({ button, menuContent, defaultOpen, open, modal, onOpenChange, ...props }, ref) => {
  const rootProps = {
    ...(defaultOpen != undefined ? { defaultOpen } : {}),
    ...(open != undefined ? { open } : {}),
    ...(onOpenChange != undefined ? { onOpenChange } : {}),
    ...(modal != undefined ? { modal } : {}),
  };

  return (
    <DropdownMenu.Root {...rootProps}>
      <DropdownMenu.Trigger ref={ref} asChild {...props}>
        {button}
      </DropdownMenu.Trigger>
      {menuContent}
    </DropdownMenu.Root>
  );
});

MenuTrigger.propTypes = {
  button: PropTypes.node.isRequired,
  menuContent: PropTypes.node.isRequired,
};

export default MenuTrigger;
