import React, { useState, useEffect } from "react";

import { AppCache } from "../../../../js-shared-lib";

function dimensionsFromImageDataUrl(imageDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (error) => reject(error);
  });
}

function roundDownToMultipleOfGrid(number) {
  return Math.floor(number / 8) * 8;
}

function calculateHeightForWidth({ width, height }) {
  const resizedWidth = 496; // TODO extract to a config variable..
  const resizedHeight = Math.floor(height * (resizedWidth / width));
  return roundDownToMultipleOfGrid(resizedHeight);
}

export default function Thumbnail({ s3Path, doLoad, isOnCanvas }) {
  const [url, setUrl] = useState(null);
  const [dimensions, setDimensions] = useState(null);

  useEffect(() => {
    const handleResponse = (blob) => {
      const url = URL.createObjectURL(blob);
      if (isOnCanvas) {
        dimensionsFromImageDataUrl(url)
          .then((_dimensions) => {
            setDimensions(_dimensions);
          })
          .finally(() => {
            setUrl(url);
          });
      } else {
        setUrl(url);
      }
    };

    const handleLoad = () => {
      doLoad(s3Path).then((response) => {
        handleResponse(response.data);
        const data = new Response(response.data);
        AppCache.put(s3Path, data);
      });
    };

    AppCache.match(s3Path).then((response) => {
      if (response) {
        response.blob().then((data) => {
          handleResponse(data);
        });
      } else {
        handleLoad();
      }
    });
  }, [s3Path, isOnCanvas]);

  if (!url) return null;

  if (isOnCanvas && dimensions) {
    // Round down height to nearest multiple of 8 so the card fits the grid perfectly
    // This encodes a known card width of 496
    const height = calculateHeightForWidth(dimensions);
    return (
      <div style={{ width: "100%", height, overflow: "hidden" }}>
        <img src={url} />
      </div>
    );
  }

  return <img src={url} />;
}
