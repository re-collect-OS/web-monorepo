import React from "react";
import PropTypes from "prop-types";

export default function LogoIcon({ className, width, height, inverted, ...rest }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      alt="re:collect logo"
      {...(width ? { width } : {})}
      {...(height ? { height } : {})}
      {...rest}
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="m10.7636 13.7404c2.2015 0 3.9862-1.7847 3.9862-3.98608 0-2.20143-1.7847-3.98604-3.9862-3.98604-2.20157 0-3.98626 1.78461-3.98626 3.98604 0 2.20138 1.78469 3.98608 3.98626 3.98608z"
          stroke={inverted ? "#817EFF" : "#4240b9"}
        />
        <path
          d="m5.97938 13.7403c2.20153 0 3.98622-1.7846 3.98622-3.98601 0-2.20143-1.78469-3.98604-3.98622-3.98604s-3.98622 1.78461-3.98622 3.98604c0 2.20141 1.78469 3.98601 3.98622 3.98601z"
          stroke={inverted ? "#E6E6E6" : "#222"}
        />
      </g>
    </svg>
  );
}
LogoIcon.displayName = "LogoIcon";

LogoIcon.propTypes = {
  className: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  inverted: PropTypes.bool,
};
