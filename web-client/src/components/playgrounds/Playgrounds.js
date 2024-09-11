import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { shallow } from "zustand/shallow";
import cn from "classnames";
import { Menu, MenuItem, MenuItemSeparator, IconButton, PinIcon, useMatchMedia, Toolbar } from "web-shared-lib";
import useLocalStorage from "use-local-storage";
import { parseTimestap, isValidIsoDate } from "js-shared-lib";

import RenameIdeaDialog from "../common/rename-idea-dialog";
import PageHeader from "../common/page-header";

import { extractTitle } from "../../libs/documentLib";
import { useStore } from "../../store";
import { events, analyticsService, sources } from "../../libs/analyticsLib";

import { DEFAULT_EDITOR_LAYOUT } from "../../config";

import MoreButton from "./MoreButton";
import styles from "./Playgrounds.module.css";

const selector = (state) => ({
  documents: state.documents.index,
  doDocumentArchive: state.doDocumentArchive,
  doDocumentDelete: state.doDocumentDelete,
  doDocumentPin: state.doDocumentPin,
  doDocumentRename: state.doDocumentRename,
  doDocumentTrash: state.doDocumentTrash,
  isLoading: state.documents.status === "loading",
  doDocumentCreateWithTitle: state.doDocumentCreateWithTitle,
});

const buildEditPath = ({ documentId, layout }) => `/${layout || DEFAULT_EDITOR_LAYOUT}/${documentId}`;

function MoreMenuButton({
  documentId,
  doDocumentArchive,
  doDocumentDelete,
  doDocumentPin,
  doDocumentRename,
  doDocumentTrash,
  history,
  isArchive,
  isCollapsed,
  isDraft,
  isPinned,
  isTrashed,
  layout,
  title,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const isHidden = isRenameDialogOpen;
  const triggerRef = React.useRef();

  return (
    <MoreButton
      ref={triggerRef}
      open={isMenuOpen}
      onOpenChange={(v) => triggerRef.current && setIsMenuOpen(v)}
      className={styles.moreButton}
      menuContent={
        <Menu
          className={styles.menu}
          // Portal because otherwise we trigger the parent Link on click
          container={document.body}
          onClick={(event) => event.stopPropagation()}
          hidden={isHidden}
          align="end"
          side={isCollapsed ? "bottom" : "top"}
          avoidCollisions={false}
          sideOffset={0}
          alignOffset={-8}
          onEscapeKeyDown={(event) => {
            if (isHidden) {
              event.preventDefault();
            }
          }}
        >
          {isTrashed && (
            <>
              <MenuItem
                textValue="restore-trash"
                onSelect={() => {
                  doDocumentTrash({ id: documentId, trashed: false });
                }}
              >
                Restore
              </MenuItem>
              <MenuItemSeparator />
              <MenuItem
                variant="destructive"
                textValue="delete"
                onSelect={() => {
                  doDocumentDelete({ id: documentId });
                }}
              >
                Permanently Delete
              </MenuItem>
            </>
          )}

          {!isTrashed && (
            <>
              <MenuItem
                variant="destructive"
                textValue="trash"
                onSelect={() => {
                  doDocumentTrash({ id: documentId });
                }}
              >
                Trash
              </MenuItem>

              {!isArchive && !isDraft && (
                <MenuItem
                  textValue="archive"
                  onSelect={() => {
                    doDocumentArchive({ id: documentId });
                  }}
                >
                  Archive
                </MenuItem>
              )}
              {isArchive && !isDraft && (
                <MenuItem
                  textValue="restore-archive"
                  onSelect={() => {
                    doDocumentArchive({ id: documentId, archived: false });
                  }}
                >
                  Restore
                </MenuItem>
              )}
              <MenuItemSeparator />
              <RenameIdeaDialog
                isDraft={isDraft}
                open={isRenameDialogOpen}
                onOpenChange={setIsRenameDialogOpen}
                initialTopic={title}
                onSubmit={({ topic }) => {
                  doDocumentRename({ id: documentId, topic, source: sources.PLAYGROUNDS });
                  setIsRenameDialogOpen(false);
                  // Dismiss menu and set focus back to the trigger
                  // From example: https://codesandbox.io/s/magical-grass-j85kbz?file=/src/App.js
                  setIsMenuOpen(false);
                  triggerRef.current.focus();
                }}
                onCancel={() => setIsRenameDialogOpen(false)}
              >
                <MenuItem textValue="rename" onSelect={(event) => event.preventDefault()}>
                  {isDraft ? "Save idea" : "Rename"}
                </MenuItem>
              </RenameIdeaDialog>
              {!isArchive && isPinned && (
                <MenuItem textValue="unpin" onSelect={() => doDocumentPin({ id: documentId, pinned: false })}>
                  Unpin
                </MenuItem>
              )}
              {!isArchive && !isPinned && !isDraft && (
                <MenuItem textValue="pin" onSelect={() => doDocumentPin({ id: documentId, pinned: true })}>
                  Pin
                </MenuItem>
              )}
              <MenuItem
                textValue="edit"
                onSelect={() => {
                  history.push(buildEditPath({ documentId, layout }));
                }}
              >
                Edit
              </MenuItem>
            </>
          )}
        </Menu>
      }
    />
  );
}

function renderDocuments({
  documents,
  doDocumentArchive,
  doDocumentPin,
  doDocumentTrash,
  doDocumentRename,
  doDocumentDelete,
  history,
  isArchive = false,
  isDraft = false,
  isCollapsed = false,
  isTrashed = false,
}) {
  const pinnedDocuments = documents.filter((doc) => !doc.archivedAt && !!doc.pinnedAt);
  const unpinnedDocuments = documents.filter((doc) => !pinnedDocuments.includes(doc));
  const sortedDocuments = [...pinnedDocuments, ...unpinnedDocuments];

  return sortedDocuments
    .map(({ documentId, body, cards, layout, createdAt, pinnedAt, archivedAt, trashedAt }) => {
      const cardCount = cards.length;
      const cardFillHeight = Math.max(Math.min((cardCount / 500) * 100, 80), 0);
      let title = extractTitle({ body });
      if (isValidIsoDate(title)) {
        title = new Date(title).toLocaleString();
      }
      const isPinned = !archivedAt && !!pinnedAt;

      let linkTitle;
      if (isArchive) {
        linkTitle = `Archived: ${parseTimestap(archivedAt).toLocaleString()}`;
      } else if (isTrashed) {
        linkTitle = `Trashed: ${parseTimestap(trashedAt).toLocaleString()}`;
      } else {
        linkTitle = `Created: ${new Date(createdAt).toLocaleString()}`;
      }

      return (
        <Link
          key={documentId}
          className={cn(styles.ideaCard, { [styles.isPinned]: isPinned })}
          title={linkTitle}
          to={buildEditPath({ documentId, layout })}
          onClick={() => analyticsService.logEvent(events.documentOpened({ documentId, source: sources.PLAYGROUNDS }))}
        >
          <div className={styles.titleWrapper}>
            <div className={styles.title}>{title}</div>
          </div>
          <div className={styles.info}>
            <div className={styles.count}>
              {isPinned && <PinIcon />}
              <div>
                {cardCount} {cardCount === 1 ? "card" : "cards"}
              </div>
            </div>
            <div className={styles.moreButtonWrapper}>
              <MoreMenuButton
                isDraft={isDraft}
                isArchive={isArchive}
                isPinned={isPinned}
                isTrashed={isTrashed}
                documentId={documentId}
                history={history}
                layout={layout}
                title={title}
                doDocumentTrash={doDocumentTrash}
                doDocumentArchive={doDocumentArchive}
                doDocumentPin={doDocumentPin}
                doDocumentRename={doDocumentRename}
                doDocumentDelete={doDocumentDelete}
                isCollapsed={isCollapsed}
              />
            </div>
          </div>
          {cardFillHeight >= 2 && !isCollapsed && (
            <div className={styles.background} style={{ height: `${cardFillHeight}%` }}>
              <svg
                className={styles.cap}
                fill="none"
                height="4"
                viewBox="0 0 200 4"
                width="200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="m200 4v-4c0 2.20914-1.791 4-4 4zm-196 0c-2.20914 0-4-1.79086-4-4v4z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
              <div className={styles.fill} />
            </div>
          )}
        </Link>
      );
    })
    .filter(Boolean);
}

export function DocumentsList({
  showArchived,
  showDrafts,
  showTrashed,
  activeDocuments,
  draftDocuments,
  archivedDocuments,
  trashedDocuments,
  doDocumentArchive,
  doDocumentPin,
  doDocumentRename,
  doDocumentCreateWithTitle,
  doDocumentTrash,
  doDocumentDelete,
  history,
  isCollapsed,
}) {
  const wrapperClassNames = cn(styles.ideaCardWrapper, { [styles.isCollapsed]: isCollapsed });

  return (
    <>
      {showArchived && (
        <div className={wrapperClassNames}>
          {renderDocuments({
            documents: archivedDocuments,
            doDocumentArchive,
            doDocumentPin,
            doDocumentRename,
            doDocumentTrash,
            doDocumentDelete,
            history,
            isArchive: true,
            isCollapsed,
          })}
        </div>
      )}
      {showDrafts && (
        <div className={wrapperClassNames}>
          {renderDocuments({
            documents: draftDocuments,
            doDocumentArchive,
            doDocumentPin,
            doDocumentRename,
            doDocumentTrash,
            doDocumentDelete,
            history,
            isDraft: true,
            isCollapsed,
          })}
        </div>
      )}
      {showTrashed && (
        <div className={wrapperClassNames}>
          {renderDocuments({
            documents: trashedDocuments,
            doDocumentArchive,
            doDocumentPin,
            doDocumentRename,
            doDocumentTrash,
            doDocumentDelete,
            history,
            isTrashed: true,
            isCollapsed,
          })}
        </div>
      )}
      {!showArchived && !showDrafts && !showTrashed && (
        <>
          <div className={wrapperClassNames}>
            <a
              href="#"
              className={cn(styles.ideaCard, styles.addIdeaButton)}
              title={"Create a new Playground"}
              onClick={() => doDocumentCreateWithTitle({ history, eventSource: sources.PLAYGROUNDS })}
            >
              <div className={styles.titleWrapper}>
                <div className={styles.title}>Create a new Playground</div>
              </div>
            </a>
            {renderDocuments({
              documents: activeDocuments,
              doDocumentArchive,
              doDocumentPin,
              doDocumentRename,
              doDocumentTrash,
              doDocumentDelete,
              history,
              isCollapsed,
            })}
          </div>
        </>
      )}
    </>
  );
}

export function ConnectedHomeWrapper({ showArchived, showDrafts, showTrashed, children }) {
  const history = useHistory();
  const {
    documents,
    doDocumentArchive,
    doDocumentCreateWithTitle,
    doDocumentDelete,
    doDocumentPin,
    doDocumentRename,
    doDocumentTrash,
    isLoading,
  } = useStore(selector, shallow);

  const [sort, setSort] = useLocalStorage("home_sort_by", "creation"); // creation || modified

  // Draft documents have a creation timestamp as the title
  const draftDocuments = documents
    .filter((d) => {
      if (d.trashedAt) {
        return false;
      }
      const title = extractTitle({ body: d.body });
      return title && isValidIsoDate(title);
    })
    .sort((d1, d2) =>
      sort === "creation"
        ? new Date(d2.createdAt) - new Date(d1.createdAt)
        : new Date(d2.modifiedAt) - new Date(d1.modifiedAt)
    );
  const activeDocuments = documents
    .filter((d) => !d.archivedAt && !d.trashedAt && !draftDocuments.includes(d))
    .sort((d1, d2) =>
      sort === "creation"
        ? new Date(d2.createdAt) - new Date(d1.createdAt)
        : new Date(d2.modifiedAt) - new Date(d1.modifiedAt)
    );
  const archivedDocuments = documents
    .filter((d) => !!d.archivedAt && !draftDocuments.includes(d))
    .sort((d1, d2) =>
      sort === "creation" ? d2.archivedAt - d1.archivedAt : new Date(d2.modifiedAt) - new Date(d1.modifiedAt)
    );
  const trashedDocuments = documents
    .filter((d) => !!d.trashedAt)
    .sort((d1, d2) =>
      sort === "creation" ? d2.trashedAt - d1.trashedAt : new Date(d2.modifiedAt) - new Date(d1.modifiedAt)
    );
  const archivedDocumentsCount = archivedDocuments.length;
  const draftDocumentsCount = draftDocuments.length;
  const trashedDocumentsCount = trashedDocuments.length;

  // Go back home if we have no archived cards
  useEffect(() => {
    if (
      (showArchived && !archivedDocumentsCount) ||
      (showDrafts && !draftDocumentsCount) ||
      (showTrashed && !trashedDocumentsCount)
    ) {
      history.replace("/playgrounds");
    }
  }, [
    archivedDocumentsCount,
    draftDocumentsCount,
    history,
    showArchived,
    showDrafts,
    showTrashed,
    trashedDocumentsCount,
  ]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      {React.cloneElement(children, {
        history,
        showArchived,
        showDrafts,
        showTrashed,
        setSort,
        sort,
        activeDocuments,
        draftDocuments,
        archivedDocuments,
        trashedDocuments,
        doDocumentArchive,
        doDocumentPin,
        doDocumentRename,
        doDocumentCreateWithTitle,
        doDocumentTrash,
        doDocumentDelete,
      })}
    </>
  );
}

function HomeLayout({
  activeDocuments,
  archivedDocuments,
  doDocumentArchive,
  doDocumentCreateWithTitle,
  doDocumentDelete,
  doDocumentPin,
  doDocumentRename,
  doDocumentTrash,
  draftDocuments,
  trashedDocuments,
  history,
  setSort,
  showArchived,
  showDrafts,
  showTrashed,
  sort,
}) {
  const pathPrefix = "/playgrounds";

  // TODO replace with size passed in from layout
  const isLayoutCollapsed = useMatchMedia(`(max-width: ${1058}px)`);

  const sortSelect = (
    <select
      name="order"
      onChange={(event) => {
        const _sort = event.target.value;
        setSort(_sort);
        analyticsService.logEvent(events.playgroundsIdeasSorted({ sort: _sort, source: sources.PLAYGROUNDS }));
      }}
      value={sort}
    >
      {showArchived && <option value="creation">Sort by archived date</option>}
      {showTrashed && <option value="creation">Sort by trashed date</option>}
      {!showArchived && !showTrashed && <option value="creation">Sort by creation date</option>}
      <option value="modified">Sort by modified date</option>
    </select>
  );

  return (
    <div className={styles.Playgrounds}>
      <div className={styles.headerWrapper}>
        <div className={styles.leftCol}>
          <PageHeader
            title={"Playgrounds"}
            description={
              "Playgrounds provide an infinite canvas and a text editor to work on your ideas and bring them to life."
            }
          />
        </div>
        <div className={styles.rightCol}>{sortSelect}</div>
      </div>

      <div>
        <Toolbar.Root
          className={cn(styles.TabBar, { [styles.isCollapsed]: isLayoutCollapsed })}
          aria-label="Navigation"
        >
          <Toolbar.Button asChild>
            <IconButton
              className={cn(styles.tabBtn, { [styles.isActive]: !showArchived && !showTrashed && !showDrafts })}
              type={"button"}
              title={"Top of mind"}
              onClick={() => {
                history.push(`${pathPrefix}`);
              }}
              full
            >
              <span className={styles.tabBtnLabel}>Top of mind</span>
            </IconButton>
          </Toolbar.Button>
          <Toolbar.Separator className={styles.separator} />
          <Toolbar.Button asChild>
            <IconButton
              className={cn(styles.tabBtn, { [styles.isActive]: showArchived })}
              type={"button"}
              title={"Archive"}
              onClick={() => {
                history.push(`${pathPrefix}/archive`);
              }}
              full
            >
              <span className={styles.tabBtnLabel}>Archive ({archivedDocuments.length})</span>
            </IconButton>
          </Toolbar.Button>
          <Toolbar.Separator className={styles.separator} />
          <Toolbar.Button asChild>
            <IconButton
              className={cn(styles.tabBtn, { [styles.isActive]: showDrafts })}
              type={"button"}
              title={"Draft"}
              onClick={() => {
                history.push(`${pathPrefix}/drafts`);
              }}
              full
            >
              <span className={styles.tabBtnLabel}>Drafts ({draftDocuments.length})</span>
            </IconButton>
          </Toolbar.Button>
          <Toolbar.Separator className={styles.separator} />
          <Toolbar.Button asChild>
            <IconButton
              className={cn(styles.tabBtn, { [styles.isActive]: showTrashed })}
              type={"button"}
              title={"Trash"}
              onClick={() => {
                history.push(`${pathPrefix}/trash`);
              }}
              full
            >
              <span className={styles.tabBtnLabel}>Trash ({trashedDocuments.length})</span>
            </IconButton>
          </Toolbar.Button>
        </Toolbar.Root>
      </div>

      {showArchived && (
        <div className={styles.sectionInstructions}>Archive Playgrounds that are no longer top of mind.</div>
      )}
      {showDrafts && (
        <div className={styles.sectionInstructions}>
          Draft Playgrounds get automatically trashed after 90 days. Name your drafts to save them.
        </div>
      )}
      {showTrashed && (
        <div className={styles.sectionInstructions}>Trashed Playgrounds get automatically deleted after 30 days.</div>
      )}

      <div className={styles.contentWrapper}>
        <DocumentsList
          showArchived={showArchived}
          showDrafts={showDrafts}
          showTrashed={showTrashed}
          activeDocuments={activeDocuments}
          draftDocuments={draftDocuments}
          archivedDocuments={archivedDocuments}
          trashedDocuments={trashedDocuments}
          doDocumentArchive={doDocumentArchive}
          doDocumentPin={doDocumentPin}
          doDocumentRename={doDocumentRename}
          doDocumentCreateWithTitle={doDocumentCreateWithTitle}
          doDocumentTrash={doDocumentTrash}
          doDocumentDelete={doDocumentDelete}
          history={history}
          isCollapsed={isLayoutCollapsed}
        />
      </div>
    </div>
  );
}

export default function Playgrounds({ showArchived, showDrafts, showTrashed }) {
  return (
    <ConnectedHomeWrapper showArchived={showArchived} showDrafts={showDrafts} showTrashed={showTrashed}>
      <HomeLayout />
    </ConnectedHomeWrapper>
  );
}
