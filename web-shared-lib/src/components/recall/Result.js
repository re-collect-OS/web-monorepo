import React, { Children, useState } from "react";
import PropTypes from "prop-types";
import cn from "classnames";

import { RecallResultHeader } from "./RecallResultContent";

import styles from "./Result.module.css";

const Result = React.forwardRef(({ children, model, onReadMore, renderArtifactNav, ...rest }, ref) => {
  const count = Children.count(children);
  const [isExpanded, setIsExpanded] = useState(false);

  const childrenWithClassname = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { className: cn(child.props.className, styles.resultSection) });
    }
    return child;
  });
  return (
    <div
      ref={ref}
      className={cn(styles.Card, { [styles.isExpanded]: isExpanded, [styles.isGraphResult]: model.isGraphResult })}
      tabIndex={0}
      {...rest}
    >
      {
        <RecallResultHeader
          className={styles.header}
          model={model}
          onReadMore={onReadMore}
          renderArtifactNav={renderArtifactNav}
        />
      }
      {childrenWithClassname && <div className={styles.body}>{childrenWithClassname}</div>}
      {/* TODO inject this limit into CSS as variables so there's one source of truth */}
      {/* Don't show for screenshots as it will be a repeat of the same image */}
      {!isExpanded && count > 1 && model.artifactType !== "google-drive-screenshot" && (
        <button
          className={styles.expandRowButton}
          title={"Show all results"}
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded(true);
          }}
        >
          •••
        </button>
      )}
    </div>
  );
});

Result.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  model: PropTypes.object.isRequired,
  onReadMore: PropTypes.func.isRequired,
  renderArtifactNav: PropTypes.func,
};

export default Result;
