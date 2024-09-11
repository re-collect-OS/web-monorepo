import React from "react";
import cn from "classnames";
import * as BaseSwitch from "@radix-ui/react-switch";

import styles from "./Switch.module.css";

export default function Switch({ className, onCheckedChange, ...props }) {
  return (
    <BaseSwitch.Root className={cn(styles.SwitchRoot, className)} onCheckedChange={onCheckedChange} {...props}>
      <BaseSwitch.Thumb className={styles.SwitchThumb} />
    </BaseSwitch.Root>
  );
}
