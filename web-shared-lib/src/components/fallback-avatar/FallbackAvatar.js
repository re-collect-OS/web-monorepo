import React, { useRef } from "react";
import PropTypes from "prop-types";

import fallbackImgSrc from "./404.png";

export default function FallbackAvatar({ src, ...props }) {
  const imgRef = useRef(null);

  return (
    <img
      ref={imgRef}
      src={src}
      onError={(err) => {
        imgRef.current.src = fallbackImgSrc;
      }}
      {...props}
    />
  );
}

FallbackAvatar.propTypes = {
  src: PropTypes.string.isRequired,
};
