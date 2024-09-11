import React, { useState } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import {
  AddIcon,
  ExpandIcon,
  IconButton,
  JoinIcon,
  Menu,
  MenuHorizontalIcon,
  MenuItem,
  MenuTrigger,
  OpenIcon,
  RemoveIcon,
  Toolbar,
  WriteIcon,
} from "web-shared-lib";

import ExportDialog from "../common/export-dialog";

import { sources } from "../../libs/analyticsLib";

import styles from "./CardsToolbar.module.css";

const stopPropagation = (fn) => (event) => {
  event.stopPropagation();
  fn(event);
};

const RemoveButton = React.forwardRef(({ selectedCount, onClick, ...rest }, ref) => {
  return (
    <Toolbar.Button asChild>
      <IconButton
        ref={ref}
        variant={"destructive"}
        icon={<RemoveIcon />}
        label={selectedCount === 1 ? "Remove" : `Remove (${selectedCount})`}
        onClick={onClick}
        title={`Remove ${selectedCount} ${selectedCount === 1 ? "card" : "cards"}`}
        {...rest}
      />
    </Toolbar.Button>
  );
});

const NoteCardMoreMenuButton = React.forwardRef(({ onTweetClick, ...rest }, ref) => {
  return (
    <MenuTrigger
      button={
        <Toolbar.Button asChild>
          <IconButton ref={ref} icon={<MenuHorizontalIcon />} variant={"grey"} title={"More"} {...rest} />
        </Toolbar.Button>
      }
      menuContent={
        <Menu align="end" side="bottom" alignOffset={-8} container={document.body}>
          <MenuItem textValue="Export as Tweet" onSelect={onTweetClick}>
            Tweet note card
          </MenuItem>
        </Menu>
      }
    />
  );
});

const SeparateButton = React.forwardRef(({ onClick, ...rest }, ref) => {
  return (
    <Toolbar.Button asChild>
      <IconButton ref={ref} icon={<OpenIcon />} label={"Separate"} onClick={onClick} title="Separate cards" {...rest} />
    </Toolbar.Button>
  );
});

const JoinButton = React.forwardRef(({ onClick, ...rest }, ref) => {
  return (
    <Toolbar.Button asChild>
      <IconButton
        ref={ref}
        icon={<JoinIcon />}
        label={"Join"}
        onClick={onClick}
        title="Join card with note card"
        {...rest}
      />
    </Toolbar.Button>
  );
});

const AddNoteButton = React.forwardRef(({ onClick, ...rest }, ref) => {
  return (
    <Toolbar.Button asChild>
      <IconButton
        ref={ref}
        icon={<WriteIcon />}
        label={"Add note"}
        onClick={onClick}
        title="Make note on card"
        {...rest}
      />
    </Toolbar.Button>
  );
});

export const AddNoteCardButton = React.forwardRef(({ onClick, ...rest }, ref) => {
  return (
    <Toolbar.Button asChild>
      <IconButton
        ref={ref}
        icon={<AddIcon />}
        label={"Add note"}
        onClick={onClick}
        title="Add a new note card"
        {...rest}
      />
    </Toolbar.Button>
  );
});

const ExpandButton = React.forwardRef(({ onClick, ...rest }, ref) => {
  return (
    <Toolbar.Button asChild>
      <IconButton ref={ref} icon={<ExpandIcon />} label={"Expand"} onClick={onClick} title="Expand card" {...rest} />
    </Toolbar.Button>
  );
});

function CardsToolbarWrapper({ className, children }) {
  return (
    <Toolbar.Root className={cn(styles.Toolbar, className)} aria-label="Edit cards">
      <div className={styles.cardActions}>{children}</div>
    </Toolbar.Root>
  );
}

function NoSelectionToolbar({ className, isDraftTitle, isPlayground, onAddNoteClick, onExportClick, onRenameClick }) {
  return (
    <CardsToolbarWrapper className={className}>
      {isPlayground && (
        <>
          <AddNoteCardButton onClick={stopPropagation(onAddNoteClick)} />
        </>
      )}
      <MenuTrigger
        button={
          <Toolbar.Button asChild>
            <IconButton icon={<MenuHorizontalIcon />} title={"More"} />
          </Toolbar.Button>
        }
        menuContent={
          <Menu align="end" side="bottom" className={styles.moreMenu} alignOffset={-8} container={document.body}>
            <MenuItem
              textValue={isDraftTitle ? "Name Playground" : "Rename Playground"}
              onSelect={() => onRenameClick()}
            >
              {isDraftTitle ? "Name Playground" : "Rename Playground"}
            </MenuItem>
            <MenuItem textValue="Export .md" onSelect={() => onExportClick(true)}>
              Export
            </MenuItem>
          </Menu>
        }
      />
    </CardsToolbarWrapper>
  );
}

function MultiSelectionToolbar({ className, onJoinClick, onRemoveClick, onSeparateClick, selectedCount }) {
  return (
    <CardsToolbarWrapper className={className}>
      {onJoinClick && <JoinButton onClick={stopPropagation(onJoinClick)} />}
      {onSeparateClick && <SeparateButton onClick={stopPropagation(onSeparateClick)} />}
      <RemoveButton selectedCount={selectedCount} onClick={stopPropagation(onRemoveClick)} />
    </CardsToolbarWrapper>
  );
}

function QuerySelectionToolbar({ className, onAddNoteClick, onExpandClick, onRemoveClick, selectedCount }) {
  return (
    <CardsToolbarWrapper className={className}>
      <ExpandButton onClick={stopPropagation(onExpandClick)} />
      <AddNoteButton onClick={stopPropagation(onAddNoteClick)} />
      <RemoveButton selectedCount={selectedCount} onClick={stopPropagation(onRemoveClick)} />
    </CardsToolbarWrapper>
  );
}

function EmbeddedQuerySelectionToolbar({ className, onExpandClick, onRemoveClick, onSeparateClick, selectedCount }) {
  return (
    <CardsToolbarWrapper className={className}>
      <ExpandButton onClick={stopPropagation(onExpandClick)} />
      <SeparateButton onClick={stopPropagation(onSeparateClick)} />
      <RemoveButton selectedCount={selectedCount} onClick={stopPropagation(onRemoveClick)} />
    </CardsToolbarWrapper>
  );
}

function NoteSelectionToolbar({ className, onRemoveClick, onSeparateClick, onTweetClick, selectedCount }) {
  return (
    <CardsToolbarWrapper className={className}>
      {onSeparateClick && <SeparateButton onClick={stopPropagation(onSeparateClick)} />}
      <RemoveButton selectedCount={selectedCount} onClick={stopPropagation(onRemoveClick)} />
      <NoteCardMoreMenuButton onTweetClick={stopPropagation(onTweetClick)} />
    </CardsToolbarWrapper>
  );
}

export default function CardsToolbar({
  className,
  documentBody,
  documentId,
  isDraftTitle,
  isPlayground,
  keptCards,
  onAddNoteClick,
  onExpandClick,
  onJoinClick,
  onRemoveClick,
  onRenameClick,
  onSeparateClick,
  onTweetClick,
  selectedCards,
}) {
  const selectedCount = selectedCards.length;
  const selectedTypes = new Set(selectedCards.map((k) => k.type));
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const renderToolbar = () => {
    if (selectedCount > 1) {
      // We can join if we have one free note and kept card:
      let canJoin = false;
      let canSeparate = false;
      if (selectedCards.length === 2 && selectedTypes.has("note") && selectedTypes.has("kept")) {
        const keptCard = selectedCards.find((card) => card.type === "kept");
        const noteCard = selectedCards.find((card) => card.type === "note");
        if (!keptCard.parentId) {
          const parentIds = keptCards.map((card) => card.type === "kept" && card.parentId).filter(Boolean);
          if (!parentIds.includes(noteCard.id)) {
            canJoin = true;
          }
        } else if (keptCard.parentId === noteCard.id) {
          canSeparate = true;
        }
      }

      return (
        <MultiSelectionToolbar
          className={className}
          onJoinClick={canJoin ? onJoinClick : undefined}
          onRemoveClick={onRemoveClick}
          onSeparateClick={canSeparate ? onSeparateClick : undefined}
          selectedCount={selectedCount}
        />
      );
    } else if (selectedTypes.has("kept")) {
      if (selectedCards[0].parentId) {
        return (
          <EmbeddedQuerySelectionToolbar
            className={className}
            onExpandClick={onExpandClick}
            onRemoveClick={onRemoveClick}
            onSeparateClick={onSeparateClick}
            selectedCount={selectedCount}
          />
        );
      } else {
        return (
          <QuerySelectionToolbar
            className={className}
            onAddNoteClick={onAddNoteClick}
            onExpandClick={onExpandClick}
            onRemoveClick={onRemoveClick}
            selectedCount={selectedCount}
          />
        );
      }
    } else if (selectedTypes.has("note")) {
      const canSeparate = keptCards.findIndex((card) => card.parentId === selectedCards[0].id) > 0;
      return (
        <NoteSelectionToolbar
          className={className}
          onRemoveClick={onRemoveClick}
          onSeparateClick={canSeparate ? onSeparateClick : undefined}
          onTweetClick={onTweetClick}
          selectedCount={selectedCount}
        />
      );
    } else {
      return (
        <NoSelectionToolbar
          isPlayground={isPlayground}
          isDraftTitle={isDraftTitle}
          className={className}
          onAddNoteClick={onAddNoteClick}
          onRenameClick={onRenameClick}
          onExportClick={(open) => setIsExportDialogOpen(open)}
        />
      );
    }
  };

  const toolbar = renderToolbar();

  return (
    <>
      {toolbar}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={(open) => setIsExportDialogOpen(open)}
        documentId={documentId}
        documentBody={documentBody}
        keptCards={keptCards}
        eventSource={isPlayground ? sources.PLAYGROUND_TOOLBAR : sources.EDITOR_TOOLBAR}
      />
    </>
  );
}

CardsToolbar.propTypes = {
  className: PropTypes.string,
  documentBody: PropTypes.array.isRequired,
  documentId: PropTypes.string.isRequired,
  isDraftTitle: PropTypes.bool.isRequired,
  isPlayground: PropTypes.bool.isRequired,
  keptCards: PropTypes.array.isRequired,
  onAddNoteClick: PropTypes.func.isRequired,
  onExpandClick: PropTypes.func.isRequired,
  onRemoveClick: PropTypes.func.isRequired,
  onSeparateClick: PropTypes.func.isRequired,
  selectedCards: PropTypes.array.isRequired,
};
