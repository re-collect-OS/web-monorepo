import React from "react";
import cn from "classnames";
import PropTypes from "prop-types";

import BaseCard from "./BaseCard";

import Thumbnail from "../thumbnail";

import styles from "./KeptCard.module.css";

import { RecallResultText, RecallResultHeader } from "../recall";

export default function KeptCard({
  model,
  className,
  isChildCard,
  renderArtifactNav,
  loadThumbnailFromS3Path,
  ...rest
}) {
  return (
    <BaseCard
      className={cn(className, styles.KeptCard, { [styles.isChildCard]: isChildCard })}
      footer={
        <RecallResultHeader
          className={styles.footer}
          model={model}
          onReadMore={() => {
            // TODO
          }}
          renderArtifactNav={renderArtifactNav}
        />
      }
      {...rest}
    >
      {model.artifactType === "google-drive-screenshot" ? (
        <Thumbnail s3Path={model.thumbnailS3Path} doLoad={loadThumbnailFromS3Path} />
      ) : (
        <div>
          <RecallResultText model={model} />
        </div>
      )}
    </BaseCard>
  );
}

KeptCard.propTypes = {
  className: PropTypes.string,
  model: PropTypes.object.isRequired,
  isChildCard: PropTypes.bool,
  loadThumbnailFromS3Path: PropTypes.func,
};
