import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import useLocalStorage from "use-local-storage";
import { CrossIcon, Dialog } from "web-shared-lib";
import { Link } from "react-router-dom";

import { useQuery } from "../../../utils/router";
import { events, analyticsService } from "../../../libs/analyticsLib";
import { HELP_GUIDE_URL } from "../../../config";

import ChangeLogBadge from "./ChangeLogBadge";

import styles from "./ChangeLog.module.css";

import multipleStacksImageSrc from "./images/multiple_stacks.png";
import expandStacksImageSrc from "./images/expand_stacks.png";
import playgroundsImageSrc from "./images/playgrounds.png";
import wordStatsSrc from "./images/word_stats.gif";
import listsSrc from "./images/lists.gif";
import recallExtensionSrc from "./images/recall_extension.gif";
import pdfRecallSrc from "./images/pdf_recall.gif";
import tweetsSrc from "./images/tweets.gif";
import rangeSelectSrc from "./images/range_select.gif";
import splitLayoutSrc from "./images/split_layout.gif";
import zoomControlsSrc from "./images/zoom_controls.png";
import highlightSrc from "./images/highlight.gif";
import recallNotesSrc from "./images/recall_notes.gif";
import newHomeSrc from "./images/new_home.gif";
import pinSrc from "./images/pin.gif";
import helpAndSupportGuideSrc from "./images/help_and_support_guide.png";
import cardSnapSrc from "./images/card_snap.gif";
import cardReorderScr from "./images/card_reorder.gif";
import cardStackSrc from "./images/card_stack.gif";
import moveStackSrc from "./images/move_stack.gif";
import tweetCardSrc from "./images/tweet_card.gif";
import pdfSrc from "./images/pdf.png";
import recallExtensionV2Src from "./images/recall_extension_v2.gif";
import scratchpadSrc from "./images/scratchpad.gif";
import improvedChangelogUISrc from "./images/improved_changelog_ui.png";
import extensionV2Src from "./images/extension_v2.png";
import dailyLogSrc from "./images/daily_log.png";
import oneClickSubscribeSrc from "./images/one_click_subscribe.png";
import transcriptsSrc from "./images/transcripts.png";
import dashboardSrc from "./images/dashboard.png";
import recallV2Src from "./images/recall-v2.png";
import readwiseSrc from "./images/readwise.png";
import twitterIntegrationSrc from "./images/twitter_integration.png";

export const logData = [

    {
    date: "July 15",
    version: "0.47",
    title: "Introducing Google Suite Integration",
    body: (
      <>
              <p> <b>Google Docs </b></p>

      <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`https://recollect-ai-marketing.s3.amazonaws.com/assets.google-docs.slim.gif 2x`}
            alt={"a video of the new re:collect Sidecar MacOS app"}
          />
        </p>

        <p>
        Head to your account integrations page and connect your Google Drive account. For now, we'll only bring in your Docs and Screenshots.

        </p>
        <p> <b>Screenshots </b></p>

        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`https://recollect-ai-marketing.s3.amazonaws.com/assets.google-drive.screenshots.slim.gif`}
            alt={"a video of the new re:collect Sidecar MacOS app"}
          />
        </p>
    
      </>
    ),
  },

      
  {
    date: "July 3",
    version: "0.47",
    title: "Introducing Gist for Sidecar",
    body: (
      <>
      <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`https://recollect-ai-marketing.s3.amazonaws.com/assets.gist.demo.gif 2x`}
            alt={"a video of the new re:collect Sidecar MacOS app"}
          />
        </p>

        <p>
        Get to your unique insights faster with Gist. Once you’ve peeled more than one card, click the Gist icon and watch as your AI-personalized synthesis is created.

        </p>
        <p> <b>Update to access </b></p>
        <p>


        Click the dropdown to reveal settings and click check updates to upgrade Sidecar.
                </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`https://recollect-ai-marketing.s3.amazonaws.com/assets.gist.update.gif 2x`}
            alt={"a video of the new re:collect Sidecar MacOS app"}
          />
        </p>
    
      </>
    ),
  },

  {
    date: "March 22",
    version: "0.46",
    title: "Introducing Sidecar for macOS",
    body: (
      <>
        <p>
          Our all new <Link to="/downloads">Sidecar macOS app</Link> allows you to seamlessly 'recall' information from
          any part of your desktop. Simply peel off the results and place them exactly where you need them.
        </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`https://recollect-ai-marketing.s3.us-east-1.amazonaws.com/9116f208-3cb1-4d2f-9adc-509ed8d73513-min.gif 2x`}
            alt={"a video of the new re:collect Sidecar MacOS app"}
          />
        </p>
        <p>
          <strong>Apple Notes</strong>
        </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`https://recollect-ai-marketing.s3.us-east-1.amazonaws.com/f5743244-f70b-4bcb-ab0e-f971da5f2deb-min.gif 2x`}
            alt={"a video of the re:collect Apple Notes integration"}
          />
        </p>
        <p>
          Our <Link to="/integrations/apple-notes">Apple Notes integration</Link> allows you to Recall and utilize your
          notes without ever leaving our app.
        </p>

        <p>
          <strong>And Safari too...</strong>
        </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`https://recollect-ai-marketing.s3.us-east-1.amazonaws.com/bf305451-cf03-4eac-be4c-6fb4f5334976-min.gif 2x`}
            alt={"a video of the re:collect Safari integration"}
          />
        </p>
        <p>
          If you’re not Chrome or Arc user – now’s your chance to experience our full product. The Mac app now
          integrates your Safari browsing history.
        </p>
      </>
    ),
  },
  {
    date: "January 29",
    version: "0.45",
    title: "Connect Twitter to your re:collect account",
    body: (
      <>
        <p>
          With our latest release, you can bring your favorite Tweets/X posts into your re:collect account and make use
          of that time you spent scrolling.
        </p>
        <p>
          Head to your <Link to="/integrations/twitter">integrations hub</Link> and connect your Twitter/X account.
          We’ll bring in your bookmarks and continue to bring them in over time. You can also add posts directly to your
          re:collect account without bookmarking them by opening the post and clicking our extension.
        </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`${twitterIntegrationSrc} 2x`}
            alt={"a screenshot of the new re:collect Twitter integration"}
          />
        </p>
      </>
    ),
  },
  {
    date: "January 18",
    version: "0.44",
    title: "Connect Readwise to your re:collect account",
    body: (
      <>
        <p>
          We’re excited to release a new and much-requested feature that allows you to bring your Readwise highlights
          into your re:collect account.
        </p>
        <p>
          If you have a Readwise account and store your Kindle, physical book (yes, they can scan books!), or web
          article highlights there, you can now bring those into your re:collect account on a recurring basis from our
          new <Link to="/integrations/readwise">Integrations</Link> hub.
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${readwiseSrc} 2x`}
            alt={"a screenshot of the new re:collect Readwise integration"}
          />
        </p>
      </>
    ),
  },
  {
    date: "January 4",
    version: "0.43",
    title: "A new way to Recall",
    body: (
      <>
        <p>
          While our users love the unexpected discoveries and connections that Recall brings, we understand the need for
          speed and precision. Our latest update empowers you to pinpoint exactly what you're looking for, offering an
          option for exact results over broadly related ones. Additionally, you now have the flexibility to refine your
          searches by time range, content type, or source domain, making it easier to steer your results as your account
          grows.
        </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`${recallV2Src} 2x`}
            alt={"a screenshot of the new re:collect recall with filters UI"}
          />
        </p>
      </>
    ),
  },
  {
    date: "November 6",
    version: "0.42",
    title: "A new Homebase for your account",
    body: (
      <>
        <p>
          We've revamped our web application's Homebase for a more streamlined and user-friendly experience. The new
          layout ensures you can easily access and explore the core features of our platform. The personalized view
          allows you to access the information most relevant to you at a glance. In addition, the product now enables
          you to recall and expand articles from anywhere, plus the ability to work on your Playgrounds and read at the
          same time.
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${dashboardSrc} 2x`}
            alt={"a screenshot of the new re:collect homebase and layout"}
          />
        </p>
      </>
    ),
  },
  {
    date: "October 2",
    version: "0.41",
    title: "YouTube Transcriptions",
    body: (
      <>
        <p>
          Beyond entertainment, we rely on YouTube as a source of information. Based on your feedback, we have added the
          ability for you to add and recall insights from video transcriptions. This new feature sets the foundation for
          us to bring in other non-text-based data. Intentionally save transcripts via the browser extension and
          reference them alongside your favorite articles and PDFs when needed.
        </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`${transcriptsSrc} 2x`}
            alt={"a screenshot of the new re:collect YouTube integration"}
          />
        </p>
      </>
    ),
  },
  {
    date: "September 13",
    version: "0.40",
    title: "One-click Subscribe",
    body: (
      <>
        <p>
          Our latest update has made it easier to add a newsletter subscription to your account. The browser extension
          will automatically detect any advertised RSS newsletter feed on a current tab. Click 'Subscribe,' and all
          future posted articles will automatically be added to your re:collect account. To manage your subscriptions,
          visit the <Link to="/settings/subscriptions">Subscriptions management page</Link>.
        </p>
        <p>
          <img
            className={cn(styles.fullImage)}
            srcSet={`${oneClickSubscribeSrc} 2x`}
            alt={"a screenshot of the new re:collect one click subscribe UI"}
          />
        </p>
      </>
    ),
  },
  {
    date: "August 28",
    version: "0.39",
    title: "Daily Log",
    body: (
      <>
        <p>
          Have you ever spent a day reading, marking-up, and synthesizing only to wonder what you did that day?
          Introducing the Daily Log, a stream of what you found important over time while using re:collect. On our web
          application's main page, you can view highlights and notes made in the extension and add additional thoughts
          you’d like to remember. With the Daily Log, our goal is to help you maintain focus while still being able to
          zoom out or intentionally access something you previously thought about on any given day.
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${dailyLogSrc} 2x`}
            alt={"a screenshot of the new re:collect dashboard UI"}
          />
        </p>
      </>
    ),
  },
  {
    date: "July 19",
    version: "0.38",
    title: "Newsletter Subscriptions",
    body: (
      <>
        <p>
          Many of us have signed up for more newsletters than we can read. We subscribed to them for great content but
          are overwhelmed trying to keep up. We've heard your feedback and are excited to introduce the ability to add
          your favorite newsletters to your re:collect account. Easily retrieve information from newsletters and the
          links they contain as you brainstorm and synthesize your ideas (even if you didn’t get a chance to open or
          read them!). Stay tuned for more features to help you fight your newsletter overwhelm.
        </p>
        <p>
          To start, please visit <Link to="/settings/subscriptions">manage newsletter subscriptions</Link> in your
          account settings.
        </p>
      </>
    ),
  },
  {
    date: "June 29",
    version: "0.37",
    title: "Browser Extension V2",
    body: (
      <>
        <p>
          We’ve completely redesigned our web extension to give you a more interactive way to engage with re:collect
          wherever you are on the web.
        </p>
        <p>
          <strong>Remember what is important:</strong> When browsing the internet, you can now highlight what’s relevant
          to you and make notes on your thinking by right-clicking.
        </p>
        <p>
          <strong>Connect as you consume:</strong> As before, you can 'Recall' information by clicking the pinned
          extension. Now, you can 'Keep' your results while reading the article and build connections along the way.
        </p>
        <p>
          <strong>Better results over time:</strong> To provide feedback on which articles fit your needs and remove
          those that don't, simply use the check mark and 'X'. Over time, this will help us learn more about your
          preferences and improve your experience.
        </p>
        <p>
          Discover more information on how to use the latest features{" "}
          <a
            href="https://re-collect.notion.site/re-collect/re-collect-Help-and-Support-Guide-acb140d8b0fa42ddbbe21d96fa3bfa75"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${extensionV2Src} 2x`}
            alt={"a screenshot of the new re:collect web extension UI"}
          />
        </p>
      </>
    ),
  },
  {
    date: "June 8",
    version: "0.36",
    title: "Improved Recall UI",
    body: (
      <>
        <p>
          We have improved the accessibility of Recall by adding a button to the Playgrounds UI. To use Recall, you can
          either highlight text or click the button if you already have an idea or concept.
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${improvedChangelogUISrc} 2x`}
            alt={"a screenshot of the re:collect Recall UI"}
          />
        </p>
      </>
    ),
  },
  {
    date: "May 11",
    version: "0.35",
    title: "$2M in funding and brand update",
    body: (
      <>
        <p>
          We're happy to announce we've raised a $2M pre-seed to continue building AI tools that augment some of our
          core human abilities - memory, perception, and synthesis. Thank you to all of our early supporters! Since
          closing the funding last fall, we have been eager to share the news.{" "}
          <a
            href="https://twitter.com/recollect_ai/status/1656705832627699712"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the full announcement
          </a>
          .
        </p>
        <p>
          We also recently refreshed our brand to showcase our commitment to the intersection of cognitive science and
          AI. We hope you enjoy the new look!
        </p>
      </>
    ),
  },
  {
    date: "April 5",
    version: "0.34",
    title: "Opt-out",
    body: (
      <>
        <p>
          The browser extension now provides two options for automatically collecting content as you read. You can
          select from the new opt-out strategy or stick with the manual opt-in approach you currently use.
        </p>
        <p>
          Our new opt-out strategy allows for the automatic collection of valuable content as you browse the internet
          while still giving you control over which sites the extension can access. Note our system automatically
          filters out any websites that may contain personal or sensitive information.
        </p>
        <p>
          Head to the new <Link to="/settings/extension">Manage browser extension</Link> page to update your preferences
          and learn more.
        </p>
      </>
    ),
  },
  {
    date: "October 28",
    version: "0.33",
    title: "Scratchpads",
    body: (
      <>
        <p>
          We’ve added a version of our Playgrounds to our browser extension called Scratchpads. A quick infinite canvas
          to connect and synthesize your ideas anywhere on the web without context switching. Add notes, save what
          you’re working on for later, and jump back in when ready via our web application.
        </p>
        <p>
          To try it out simply click the "Keep" button for any result when doing a Recall from the browser extension.
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${scratchpadSrc} 2x`}
            alt={"a screenshot of the re:collect web extension keeping recalled information to a scratchpad"}
          />
        </p>
        <p>
          <i>Please note this feature requires v0.5.7 of the browser extension.</i>
        </p>
      </>
    ),
  },
  {
    date: "October 24",
    version: "0.32",
    title: "Exact matches",
    body: (
      <>
        <p>
          Looking for a specific word or phrase? You can add " " around that specific text, and Recall will prioritize
          it.
        </p>
        <p>
          For example, entering <mark className={styles.mark}>"Steve Jobs" had great intuition</mark> will surface
          results that mention Steve Jobs explicitly over ones related to intuition.
        </p>
      </>
    ),
  },
  {
    date: "September 30",
    version: "0.31",
    title: "Redesigned browser extension",
    body: (
      <>
        <p>
          To make it easier to recall information no matter where you are on the web, we have redesigned "Recall" from
          your browser extension.
        </p>
        <p>
          To "Recall" information specific to your reading, highlight text, right-click, and choose "Recall."
          Alternatively, you can now type into our recall box by popular demand. Right-click anywhere on a page and
          select "Recall" to begin. We have also offered the ability to copy and paste rediscovered insights along with
          the source title and URL.
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${recallExtensionV2Src} 2x`}
            alt={"a screenshot of the re:collect web extension recalling information"}
          />
        </p>
        <p>
          <i>Please note this feature requires v0.5.5 of the browser extension.</i>
        </p>
      </>
    ),
  },
  {
    date: "September 13",
    version: "0.30",
    title: "PDF support",
    body: (
      <>
        <p>
          Many people rely on PDFs for important information, but that information is not easily accessible. Starting
          today, using our web extension, automatically collect important PDFs and “Recall” sentence-level insights
          alongside your favorite articles, tweets, and notes while working on your ideas.
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${pdfSrc} 2x`}
            alt={"a screenshot of the re:collect web extension collecting a PDF"}
          />
        </p>
        <p>
          <i>Please note this feature requires v0.5.0 of the browser extension.</i>
        </p>
      </>
    ),
  },
  {
    date: "August 23",
    version: "0.29",
    title: "Card stacks",
    body: (
      <>
        <p>
          We’re excited to introduce the first primitive for structuring your playgrounds: the card stack. Simply attach
          a card below or above another card to form a stack. The cards will snap together when they get close to each
          other - like magnets:
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${cardSnapSrc} 2x`}
            alt={"animation demonstrating drag to snap cards together"}
          />
        </p>
        <p>Re-order a card within a stack as you’re playing with your ideas:</p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${cardReorderScr} 2x`}
            alt={"animation demonstrating drag to reorder cards"}
          />
        </p>
        <p>Double click a card to select the whole stack:</p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${moveStackSrc} 2x`}
            alt={"animation demonstrating selecting and moving a whole stack of cards at once"}
          />
        </p>
        <p>And best of all, the cards will remain attached even when you modify one of the cards:</p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${cardStackSrc} 2x`}
            alt={"animation demonstrating stacked cards pushing each other out of the way"}
          />
        </p>
        <p>
          <strong>Other small changes and improvements:</strong>
        </p>
        <ul>
          <li>
            Hold down the <span className={styles.code}>Option / Alt</span> key to drag cards from anywhere
          </li>
          <li>Double click the zoom indicator to reset zoom to 100%</li>
          <li>Pan and zoom while dragging a card is now supported</li>
        </ul>
      </>
    ),
  },
  {
    date: "August 22",
    version: "0.28",
    title: "Tweet from the playground",
    body: (
      <>
        <p>
          Share any note card via Twitter by selecting the card, clicking the "more" menu in the top right corner, and
          picking "Tweet note card."
        </p>
        <p>
          <img
            className={cn(styles.fullImage, styles.roundedImage)}
            srcSet={`${tweetCardSrc} 2x`}
            alt={"animation demonstrating how to tweet from the playground"}
          />
        </p>
      </>
    ),
  },
  {
    date: "July 27",
    version: "0.27",
    title: "New help and support guide",
    body: (
      <>
        <p>
          We’ve started compiling the most frequently asked questions we get about using re:collect in a{" "}
          <a href={HELP_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            help and support guide
          </a>
          . If you want to reference the guide, a link to it and an introductory video are now available via the
          resources menu in the bottom right corner of the web application.
        </p>
        <p>
          <img
            // className={styles.roundedImage}
            srcSet={`${helpAndSupportGuideSrc} 2x`}
            alt={"screenshot showing the help and resources menu in the web application"}
          />
        </p>
      </>
    ),
  },
  {
    date: "July 11",
    version: "0.26",
    title: "Pin ideas",
    body: (
      <>
        <p>
          We've added the ability to pin and unpin ideas from the top of the list. Use this to keep top-of-mind ideas
          from sinking down as you work.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${pinSrc} 2x`}
            alt={"video demonstrating how to pin and unpin an idea"}
          />
        </p>
      </>
    ),
  },
  {
    date: "July 7",
    version: "0.25",
    title: "Your new homebase",
    body: (
      <>
        <p>
          We’ve redesigned the homebase to improve your ability to interact and navigate across ideas. You can now track
          how many notes and kept cards you’ve added to your ideas.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${newHomeSrc} 2x`}
            alt={"video of the new homebase and resources menu"}
          />
        </p>
        <p>
          Product updates, feedback submissions, and keyboard shortcuts also have a new home. Available throughout the
          web application, click on the resources icon on the bottom right to explore.
        </p>
      </>
    ),
  },
  {
    date: "May 25",
    version: "0.24",
    title: "Recall your notes across ideas",
    body: (
      <>
        <p>
          To further help you synthesize, we’ve added the ability to recall the notes you create within re:collect
          across or within your different ideas. Just like with a remembered article, you can highlight, click recall
          and keep.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${recallNotesSrc} 2x`}
            alt={"video of notes from other ideas coming up in recall results"}
          />
        </p>
      </>
    ),
  },

  {
    date: "May 18",
    version: "0.23",
    title: "Keep and add notes to highlights",
    body: (
      <>
        <p>
          Do you want to keep the information you’re discovering using our expanded view? Now you can highlight, keep
          and add notes to snippets of any relevant text you want to use later to produce content.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${highlightSrc} 2x`}
            alt={"video of highlighting in the expanded view"}
          />
        </p>
      </>
    ),
  },

  {
    date: "May 9",
    version: "0.22",
    title: "Zoom controls",
    body: (
      <>
        <p>
          We’ve improved the zoom controls to expose some of the functionality previously only available via keyboard
          shortcuts. We’ve also added the ability to fit all the cards into view in case you ever lose your place on the
          infinite canvas:
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${zoomControlsSrc} 2x`}
            alt={"screenshot of the new zoom controls"}
          />
        </p>
      </>
    ),
  },
  {
    date: "May 4",
    version: "0.21",
    title: "Cut, copy and paste cards",
    body: (
      <>
        <p>
          You’re now able to cut, copy and paste cards within or between playgrounds! Try it out today with these handy
          keyboard shortcuts:
        </p>
        <ul className={styles.codes}>
          <li>
            <span className={styles.code}>Cmd / Ctrl</span> + <span className={styles.code}>x</span> to cut selected
            cards
          </li>
          <li>
            <span className={styles.code}>Cmd / Ctrl</span> + <span className={styles.code}>c</span> to copy selected
            cards
          </li>
          <li>
            <span className={styles.code}>Cmd / Ctrl</span> + <span className={styles.code}>v</span> to paste cut /
            copied cards
          </li>
        </ul>
      </>
    ),
  },
  {
    date: "May 2",
    version: "0.20",
    title: "Split editor view",
    body: (
      <>
        <p>
          You can now see your Document and Playground simultaneously in a split view! Now you have the flexibility to
          ideate and write up your final document, making creation even easier. For a side-by-side view, select the
          "split editor" icon in the bottom right corner of the web application.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${splitLayoutSrc} 2x`}
            alt={"video demonstrating the new split editor layout"}
          />
        </p>
      </>
    ),
  },
  {
    date: "April 14",
    version: "0.19",
    title: "Drag select multiple cards",
    body: (
      <>
        <p>
          You're now able to click and drag your cursor to create a box selection and select all cards in a specific
          area of the Playground! Any card that the box selection touches will be selected. To continue adding to a
          selection hold the Shift key while dragging. To remove a card from the selection, hold down the Cmd key and
          click or box select over the selected card.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${rangeSelectSrc} 2x`}
            alt={"video demonstrating drag select and move multiple cards"}
          />
        </p>
      </>
    ),
  },
  {
    date: "April 11",
    version: "0.18",
    title: "Tweets now available on re:collect",
    body: (
      <>
        <p>
          Many of you spend a lot of time on Twitter and don't have a good way to find tweets later. We also understand
          that Twitter is one of the primary platforms where people publish new ideas and get quick feedback. In comes
          re:collect, you can now "remember" tweets using our browser extension and have them come back to you when you
          need them. Like remembering articles, select the extension button and click "Remember".
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${tweetsSrc} 2x`}
            alt={"video showing a tweet thread inside re:collect"}
          />
        </p>
      </>
    ),
  },
  {
    date: "April 6",
    version: "0.17",
    title: "Recall from web-based PDFs",
    body: (
      <>
        <p>
          We're excited to share that you can now use our "Recall" from web-based PDFs using our browser extension. Like
          recalling from other corners of the web, you can highlight text in your browser, right-click and select the
          re:collect icon to "Recall". If you'd like to recall something not directly in the PDF, edit what you're
          looking for by changing the text in the query box.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${pdfRecallSrc} 2x`}
            alt={"video showing how to recall from any pdf"}
          />
        </p>
      </>
    ),
  },
  {
    date: "March 28",
    version: "0.16",
    title: "Recall with our browser extension",
    body: (
      <>
        <p>
          Access your re:collect wherever you are in your browser*. To use, highlight some text in your browser,
          right-click and then select the re:collect icon where it says “Recall.” If you’d like to recall something not
          directly in the text, edit what you ask re:collect by changing the text in the query box.
        </p>
        <p>
          <small>* This excludes Google Docs for now.</small>
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${recallExtensionSrc} 2x`}
            alt={"video showing how to recall from any website"}
          />
        </p>
      </>
    ),
  },
  {
    date: "March 18",
    version: "0.15",
    title: "Outlining",
    body: (
      <>
        <p>
          We've added the ability to create nested lists for all your basic outlining needs. Just press the{" "}
          <span className={styles.code}>Tab</span> key to indent and <span className={styles.code}>Shift</span> +{" "}
          <span className={styles.code}>Tab</span> to remove a level of indentation. It works in the main document
          editor as well as in note cards!
        </p>
        <p>
          <img className={styles.roundedImage} srcSet={`${listsSrc} 2x`} alt={"video showing how to create a list"} />
        </p>
      </>
    ),
  },
  {
    date: "March 14",
    version: "0.14",
    title: "Word and character counts",
    body: (
      <>
        <p>
          You can now see the word and character count while fleshing out your idea. The stats are available in the
          bottom left corner of the editor and playground. Click to switch between different units.
        </p>
        <p>
          <img
            className={styles.roundedImage}
            srcSet={`${wordStatsSrc} 2x`}
            alt={"video showing how to toggle between word and character statistics in the editor"}
          />
        </p>
      </>
    ),
  },
  {
    date: "March 11",
    version: "0.13",
    title: "Hyperlinks",
    body: (
      <>
        <p>
          You're now able to select any text and turn it into a hyperlink. Use the new button in the toolbar or use this
          handy keyboard shortcut:
        </p>
        <ul className={styles.codes}>
          <li>
            <span className={styles.code}>Cmd / Ctrl</span> + <span className={styles.code}>k</span> to add or remove a
            link from the selected text
          </li>
        </ul>
      </>
    ),
  },
  {
    date: "March 3",
    version: "0.12",
    title: "Grouped results by article",
    body: (
      <>
        <p>
          Sometimes an article is such a good match that multiple sections end up matching a specific query. We've made
          it easier to quickly scan through a stack by grouping results by the source article in the expanded stack
          view. You're still able to navigate the results by score instead of article in the regular floating stacks.
        </p>
      </>
    ),
  },
  {
    date: "February 17",
    version: "0.11",
    title: "Add additional data",
    body: (
      <>
        <p>
          We've made it easier to bulk import additional articles at any time from services like Pocket, Instapaper or
          Chrome bookmarks. Access the import flow anytime from the <Link to="/settings">Settings page</Link>. More
          integrations coming soon!
        </p>
      </>
    ),
  },
  {
    date: "February 3",
    version: "0.10",
    title: "Playgrounds",
    body: (
      <>
        <p>
          We're excited to introduce a whole new dimension to the product. Think freely with Playgrounds — an infinite
          canvas for your thoughts and insights. Toggle the spatial Playground view on any of your idea documents during
          the exploration and research phase, then move seamlessly back to the linear Document view while you're
          writing. We'd love for you to try it out and let us know what you think!
        </p>
        <p>
          <img srcSet={`${playgroundsImageSrc} 2x`} alt={"screenshot of the new Playground document view"} />
        </p>
      </>
    ),
  },
  {
    date: "January 26",
    version: "0.9",
    title: "Improved expanded stacks",
    body: (
      <>
        <p>
          You're now able to expand a stack of results as opposed to just a single result. We also now do a better job
          preserving the structure of the original article. Try it out, let us know what you think!
        </p>
        <p>
          <img srcSet={`${expandStacksImageSrc} 2x`} alt={"screenshot of the new expanded stack UI"} />
        </p>
      </>
    ),
  },
  {
    date: "January 24",
    version: "0.8",
    title: "Multiple stacks",
    body: (
      <>
        <p>Thanks to your feedback we've pushed a big change to how the result stacks look and behave:</p>
        <p>
          <img srcSet={`${multipleStacksImageSrc} 2x`} alt={"screenshot of the new stacks UI"} />
        </p>
        <p>Some notable changes:</p>
        <ul>
          <li>Switch between multiple query results in a tabbed interface</li>
          <li>Get a visual indicator of progress into a stack as you navigate</li>
          <li>If you drag the results window it will now remember where you last placed it</li>
          <li>Contextual menus and a new look for the result cards</li>
        </ul>
      </>
    ),
  },
  {
    date: "December 2",
    version: "0.7",
    title: "Structural undo",
    body: (
      <>
        <p>
          From the start we've had the ability to undo and redo changes in the text editor and note cards. Additionally,
          it is now possible to also undo any structural document changes like adding, re-ordering or removing cards.
          Just note that the individual editors still maintain their own history stack separate from the document. To
          try out the structural undo make sure you don't have an active cursor in the main editor or one of the note
          cards and try:
        </p>
        <ul className={styles.codes}>
          <li>
            <span className={styles.code}>Cmd / Ctrl</span> + <span className={styles.code}>z</span> to undo
          </li>
          <li>
            <span className={styles.code}>Cmd / Ctrl</span> + <span className={styles.code}>Shift</span> +{" "}
            <span className={styles.code}>z</span> to redo
          </li>
        </ul>
      </>
    ),
  },
  {
    date: "November 15",
    version: "0.6",
    title: "Reorder cards",
    body: (
      <>
        <p>
          We've added the ability to re-organize your kept cards and notes. Use the new buttons in the toolbar or use
          this handy keyboard shortcut:
        </p>
        <ul className={styles.codes}>
          <li>
            <span className={styles.code}>Cmd / Ctrl</span> + <span className={styles.code}>Shift</span> +{" "}
            <span className={styles.code}>arrow keys</span> to move selected cards up and down
          </li>
        </ul>
      </>
    ),
  },
  {
    date: "November 4",
    version: "0.5",
    title: "Synthesize with your own notes",
    body: (
      <>
        <p>
          Note down summaries, opinions or interpretations of the cards you're keeping by adding a note to any card.
          We've also made big improvements to the card editor, now with much improved keyboard navigation support. Try
          out these new keyboard shortcuts:
        </p>
        <ul className={styles.codes}>
          <li>
            <span className={styles.code}>+</span> to add note to a selected card
          </li>
          <li>
            <span className={styles.code}>+</span> to join selected card and note card
          </li>
          <li>
            <span className={styles.code}>-</span> to separate the selected card from a note card
          </li>
          <li>
            <span className={styles.code}>enter</span> to trigger the primary action: expand or edit depending on card
            type
          </li>
          <li>
            <span className={styles.code}>esc</span> to exit note card edit mode or deselect the card
          </li>
        </ul>
      </>
    ),
  },
  {
    date: "September 29",
    version: "0.4",
    title: "Expand cards to get the full context",
    body: (
      <p>
        Keeping you in a focused state while writing is one of our big goals. To that end we've made it really easy to
        expand a card into the full article - right inside the editor. This makes it possible to quickly get the context
        of the quote and in the near future clip new highlights. Stay tuned!
      </p>
    ),
  },
  {
    date: "September 27",
    version: "0.3",
    title: "Note cards",
    body: (
      <p>
        We've just rolled out support for note cards. Keep track of your own thoughts right along with your highlights.
      </p>
    ),
  },
  {
    date: "September 16",
    version: "0.2",
    title: "Editing multiple cards just got a lot easier",
    body: (
      <p>
        We're making good progress on the editor. You can now select multiple cards at once and quickly remove them.
        More bulk editing commands coming soon!
      </p>
    ),
  },
  {
    date: "September 29",
    version: "0.1",
    title: "Welcome to the change log!",
    body: (
      <p>
        We're excited to keep everyone up to date with new features going forward. Thank you to all the early testers
        for your feedback and insights.
      </p>
    ),
  },
];

function Card({ version, title, children, unread }) {
  return (
    <div className={cn(styles.card, { [styles.isUnread]: unread })} onClick={(event) => event.stopPropagation()}>
      <div className={styles.version}>{version}</div>
      <div className={styles.title}>{title}</div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.arrayOf(PropTypes.node)]),
  title: PropTypes.string.isRequired,
  unread: PropTypes.bool,
  version: PropTypes.string.isRequired,
};

const versionString = (date, version) => `${date} — v${version}`;

export function compareStringVersions(a, b) {
  // Handle case where we don't have valid strings to compare
  const hasA = typeof a === "string";
  const hasB = typeof b === "string";
  if (!hasA && hasB) {
    return 1;
  } else if (hasA && !hasB) {
    return -1;
  } else if (!hasA && !hasB) {
    return 0;
  }

  // Do version compare
  const pa = a.split(".");
  const pb = b.split(".");
  for (let i = 0; i < 3; i++) {
    const na = Number(pa[i]);
    const nb = Number(pb[i]);
    if (na > nb) return 1;
    if (nb > na) return -1;
    if (!isNaN(na) && isNaN(nb)) return 1;
    if (isNaN(na) && !isNaN(nb)) return -1;
  }
  return 0;
}

const ChangeLogFeed = ({ className, logData, lastAppVersion }) => {
  return (
    <div className={cn(styles.feed, className)}>
      {logData.map((l, index) => (
        <Card
          key={index}
          version={versionString(l.date, l.version)}
          title={l.title}
          unread={compareStringVersions(lastAppVersion, l.version) < 0}
        >
          {l.body}
        </Card>
      ))}
    </div>
  );
};

export const ChangeLog = ({ ...props }) => {
  const routerQuery = useQuery();
  const lastAppVersion = routerQuery.get("lastVersion");

  return <ChangeLogFeed logData={logData} lastAppVersion={lastAppVersion} {...props} />;
};

export const ChangeLogDialog = ({ open, onOpenChange, children, lastAppVersion, setLastAppVersion, eventSource }) => {
  const topLog = logData[0];

  useEffect(() => {
    if (open) {
      analyticsService.logEvent(events.changeLogOpened({ source: eventSource }));
    }
  }, [open, eventSource]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(_open) => {
        onOpenChange(_open);
        if (!_open && setLastAppVersion) {
          setLastAppVersion(topLog.version);
        }
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <div className={styles.dialog}>
            <ChangeLogFeed logData={logData} lastAppVersion={lastAppVersion} />
          </div>
          <Dialog.Close asChild>
            <button className={styles.CloseButton} title="Dismiss">
              <CrossIcon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

ChangeLogDialog.propTypes = {
  setLastAppVersion: PropTypes.func.isRequired,
};

export const ChangeLogWithBadge = React.forwardRef(({ eventSource }, ref) => {
  const [lastAppVersion, setLastAppVersion] = useLocalStorage("changelog_version", "0");
  const [open, setOpen] = useState(false);
  const topLog = logData[0];

  return (
    <ChangeLogDialog
      open={open}
      onOpenChange={setOpen}
      lastAppVersion={lastAppVersion}
      setLastAppVersion={setLastAppVersion}
      eventSource={eventSource}
    >
      <ChangeLogBadge
        ref={ref}
        title={topLog.title}
        version={`re:collect — v${topLog.version}`}
        unread={compareStringVersions(lastAppVersion, topLog.version) < 0}
      />
    </ChangeLogDialog>
  );
});

ChangeLogWithBadge.propTypes = {
  eventSource: PropTypes.string.isRequired,
};
