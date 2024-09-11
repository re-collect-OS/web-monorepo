import React, { useState } from "react";

import { Menu, MenuItem, MenuTrigger, MenuItemInput, MenuItemSeparator } from "../menu";
import { CheckIcon } from "../icons";

import { extractHostname } from "../../../../js-shared-lib";

import styles from "./RecallFilters.module.css";

export default function RecallFilters({
  options = {
    searchType: "related",
    timeFilter: "any",
    typeFilter: "any",
    domainFilter: "any",
  },
  setOptions,
  menuContainer,
  onReportFilterSet,
}) {
  const searchType = options.searchType;
  const timeFilter = options.timeFilter;
  const typeFilter = options.typeFilter;
  const domainFilter = options.domainFilter;
  const showDomainFilter = ["any", "article", "pdf"].includes(typeFilter);

  const setOptionsWithSource = (opts) => setOptions({ ...opts, source: "manual" });
  const setSearchType = (searchType) => {
    setOptionsWithSource({ ...options, searchType });
    onReportFilterSet({ key: "searchType", value: searchType });
  }; // related, exact
  const setTimeFilter = (timeFilter) => {
    setOptionsWithSource({ ...options, timeFilter });
    onReportFilterSet({ key: "timeFilter", value: timeFilter });
  }; // any, now, recent, older
  const setTypeFilter = (typeFilter) => {
    setOptionsWithSource({ ...options, typeFilter, ...(showDomainFilter ? {} : { domainFilter: "any" }) }); // reset the domain filter if we're not showing the UI
    onReportFilterSet({ key: "typeFilter", value: typeFilter });
  }; // any, article, pdf, youtube, note, tweet
  const setDomainFilter = (domainFilter) => {
    setOptionsWithSource({ ...options, domainFilter });
    onReportFilterSet({ key: "domainFilter", value: domainFilter });
  };
  const [domain, setDomain] = useState(domainFilter === "any" ? "" : domainFilter);

  const [isSearchTypeFilterOpen, setIsSearchTypeFilterOpen] = useState(false);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [isDomainFilterMenuOpen, setIsDomainFilterMenuOpen] = useState(false);

  return (
    <div className={styles.RecallFilters}>
      {"Show "}
      <MenuTrigger
        modal={false}
        open={isSearchTypeFilterOpen}
        onOpenChange={(open) => setIsSearchTypeFilterOpen(open)}
        button={
          <button aria-label={"Set search type"} title={"Set search type"}>
            {searchType === "related" ? "related results" : "exact results"}
          </button>
        }
        menuContent={
          <Menu
            align="start"
            side="bottom"
            className={styles.menu}
            avoidCollisions={false}
            alignOffset={-8}
            container={menuContainer}
          >
            <MenuItem
              endIcon={searchType === "exact" ? <CheckIcon /> : null}
              textValue="Exact results"
              onClick={() => setSearchType("exact")}
            >
              Exact results
            </MenuItem>
            <MenuItem
              endIcon={searchType === "related" ? <CheckIcon /> : null}
              textValue="Related results"
              onClick={() => setSearchType("related")}
            >
              Related results
            </MenuItem>
          </Menu>
        }
      />
      {" from "}
      <MenuTrigger
        modal={false}
        open={isTimeFilterOpen}
        onOpenChange={(open) => setIsTimeFilterOpen(open)}
        button={
          <button aria-label={"Set time filter"} title={"Set time filter"}>
            {timeFilter === "any" && "any time"}
            {timeFilter === "now" && "less than a week ago"}
            {timeFilter === "recent" && "less than 3 months ago"}
            {timeFilter === "older" && "more than 3 months ago"}
          </button>
        }
        menuContent={
          <Menu
            align="start"
            side="bottom"
            className={styles.menu}
            avoidCollisions={false}
            alignOffset={-8}
            container={menuContainer}
          >
            <MenuItem
              endIcon={timeFilter === "any" ? <CheckIcon /> : null}
              textValue="Any time"
              onClick={() => setTimeFilter("any")}
            >
              Any time
            </MenuItem>
            <MenuItem
              endIcon={timeFilter === "now" ? <CheckIcon /> : null}
              textValue="Now"
              onClick={() => setTimeFilter("now")}
            >
              Less than a week ago
            </MenuItem>
            <MenuItem
              endIcon={timeFilter === "recent" ? <CheckIcon /> : null}
              textValue="Recent"
              onClick={() => setTimeFilter("recent")}
            >
              Less than 3 months ago
            </MenuItem>
            <MenuItem
              endIcon={timeFilter === "older" ? <CheckIcon /> : null}
              textValue="Older"
              onClick={() => setTimeFilter("older")}
            >
              More than 3 months ago
            </MenuItem>
          </Menu>
        }
      />
      {" of type "}
      <MenuTrigger
        modal={false}
        open={isTypeFilterOpen}
        onOpenChange={(open) => setIsTypeFilterOpen(open)}
        button={
          <button aria-label={"Set type filter"} title={"Set type filter"}>
            {typeFilter === "any" && "any type"}
            {typeFilter === "article" && "article"}
            {typeFilter === "pdf" && "PDF"}
            {typeFilter === "note" && "note"}
            {typeFilter === "youtube" && "YouTube"}
            {typeFilter === "tweet" && "Tweet"}
            {typeFilter === "apple-notes" && "Apple Notes"}
          </button>
        }
        menuContent={
          <Menu align="start" side="bottom" className={styles.menu} alignOffset={-8} container={menuContainer}>
            <MenuItem
              endIcon={typeFilter === "any" ? <CheckIcon /> : null}
              textValue="Any type"
              onClick={() => setTypeFilter("any")}
            >
              Any type
            </MenuItem>
            <MenuItem
              endIcon={typeFilter === "article" ? <CheckIcon /> : null}
              textValue="Article"
              onClick={() => setTypeFilter("article")}
            >
              Article
            </MenuItem>
            <MenuItem
              endIcon={typeFilter === "pdf" ? <CheckIcon /> : null}
              textValue="PDF"
              onClick={() => setTypeFilter("pdf")}
            >
              PDF
            </MenuItem>
            <MenuItem
              endIcon={typeFilter === "note" ? <CheckIcon /> : null}
              textValue="note"
              onClick={() => setTypeFilter("note")}
            >
              Note
            </MenuItem>
            <MenuItem
              endIcon={typeFilter === "youtube" ? <CheckIcon /> : null}
              textValue="YouTube"
              onClick={() => setTypeFilter("youtube")}
            >
              YouTube
            </MenuItem>
            <MenuItem
              endIcon={typeFilter === "tweet" ? <CheckIcon /> : null}
              textValue="Tweet"
              onClick={() => setTypeFilter("tweet")}
            >
              Tweet
            </MenuItem>
            <MenuItem
              endIcon={typeFilter === "apple-notes" ? <CheckIcon /> : null}
              textValue="Apple Notes"
              onClick={() => setTypeFilter("apple-notes")}
            >
              Apple Notes
            </MenuItem>
          </Menu>
        }
      />
      {showDomainFilter && (
        <>
          {" from "}
          <MenuTrigger
            modal={false}
            open={isDomainFilterMenuOpen}
            onOpenChange={(open) => setIsDomainFilterMenuOpen(open)}
            button={
              <button aria-label={"Set domain filter"} title={"Set domain filter"}>
                {domainFilter === "any" ? "any domain" : domainFilter}
              </button>
            }
            menuContent={
              <Menu
                align="start"
                side="bottom"
                className={styles.menu}
                avoidCollisions={false}
                alignOffset={-8}
                container={menuContainer}
              >
                <MenuItem
                  endIcon={domainFilter === "any" ? <CheckIcon /> : null}
                  textValue="Any domain"
                  onClick={() => {
                    setDomainFilter("any");
                    setDomain("");
                  }}
                >
                  Any domain
                </MenuItem>
                <MenuItemSeparator />
                <MenuItemInput
                  placeholder="Domain or url"
                  value={domain}
                  onChange={(event) => {
                    setDomain(event.target.value);
                    setDomainFilter(extractHostname(event.target.value) || "any");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setIsDomainFilterMenuOpen(false);
                    }
                  }}
                  autoFocus
                />
              </Menu>
            }
          />
        </>
      )}
    </div>
  );
}
