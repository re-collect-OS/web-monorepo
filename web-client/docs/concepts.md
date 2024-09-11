# Web-client Concepts

Concepts you need to understand if you’re new to the web-client codebase:

### Monorepo

The `web-monorepo` is as the name suggests a monorepo. I recommend you open the whole repo in your editor instead of a specific project as they share significant code that’s spit across `web-shared-lib` and `js-shared-lib` . Revisit the individual `[README.md](http://README.md)` documentation for the shared libraries to get an idea of what they’re for.

### Stack

This is a [React.js](https://react.dev/) 16 Javascript codebase. We don’t use a framework - there’s just a simple webpack config. This might feel dated depending on when you’re reading this (React 19 was just announced when I’m writing this.)

We have [eslint](https://eslint.org/) and [Prettier](https://prettier.io/) auto-formatting configured to keep things sane.

[CSS modules](https://github.com/css-modules/css-modules) are used for styling. It might be surprising how few shared styles there are. This was intentional but the assumption was we’d at some point outgrow this and need to backtrack the decision. I think this is ok as it’s mostly mechanical work to extract. Undoing premature abstractions is way more painful.

The project is set up for Typescript but there is only one Typescript file (`canvasModel.ts`). No justification provided.

Minimal dependencies was an intentional choice.

### Store

Our application state is a [Zustrand](https://docs.pmnd.rs/zustand/getting-started/introduction) store with [Immer](https://github.com/immerjs/immer) middleware. You can think of this as a very simple in memory database and the bulk of the application business logic in one object.

The Immer middleware enables us to use immutable state in a more convenient way. Also, with Immer, you can simplify handling immutable data structures in Zustand. We also rely on it’s [patches](https://immerjs.github.io/immer/patches/) to power the undo system in Playgrounds.

State is organized in “slices” which is just a way to separate state and methods in class like structures that otherwise finally get merged into one giant thing.

### API Client

Auth is handled by Cognito and we used the Axios based API client that came with `aws-amplify` .

Files of interest are `apiLib.js`

### Models

**API Model**

The API model are a set of utility functions that map server JSON responses to the internal data model. Because we don't have types these functions act as way to guarantee we get a predictable shaped object in our own code and don't blindly pass through what the server gave us. This however means that adding a new field to a response on the server will not magically make it show up in the client - the mapping functions need to be altered!

For the most part most server and internal models map 1:1 except for the naming convention is changed from snake to camel case. I did collapse `type` and `subtype` into one `artifactType` for convenience.

Files of interest are `apiModel.js` specifically `mapUserDataResultToModel` and `mapConnectionResultToModel`

**Document Model**

The API model then converted responses like artifacts or Recall results to our internal representation. The Document model is utility functions to create models for the Playground. This is the "document" meaning the Playground itself as well as the various kept cards. The cards extend the internal API models with created and modified timestamps, type, subtype (not to be confused with `artifactType` which is partially why I flattened the artifact type and subtype into one) as well as other relevant keys for the cards (position etc).

IMPORTANT: If adding new keys to these models it's important to update both the API and Document models to the extent that it matters. If the new key doesn't need to be persisted to the cards table then it can be ommited.

IMPORTANT: It's also worth pointing out that the `RecallResults` components and (Playground) `Card` components are different things. They share some inner components like how we render the text of a match or the card headers but adding a new type requires implementing components on both sides. Put simply: just because you updated Recall to show a new card type properly doesn't mean it will work when that card is kept. It very likely will render something as it falls back to the most generic form but it probably will not be what you expected.

Files of interest are `documentModel.js`

### Canvas

Playgrounds are a custom implementation. The core panning mechanics were heavily borrowed from early [TLDraw](https://www.tldraw.com/) work and that’s still likely the best resource for how to do this right. We don’t use any of the abstractions and the products work quite differently internally at this point.

The canvas only deals with panning around an infinite grid view. What renders on there is the responsibility of the Editor.

Files of interest are `canvasModel.ts` , `Canvas.js`

### Editor

Editor is the overall name of what we now call Playgrounds. It includes the canvas, the linear document editor, the split layout and all the rendering logic that deals with rendering cards on the canvas.

Files of interest are `Editor.js`, `spatialIndex.js`, `selectionUtil.js` , `Card.js` , `CardStack.js`

**SelectionUtil**

The Selection Util centralize card stack selection logic and state. Because the Editor component is so complex it made sense to extract specific concepts into utility classes. It’s rather self-explanatory but note that it has a reference to the SpatialIndex to power the selection keyboard navigation across the spatial canvas!

**Spatial Index**

The Spatial Index is abstracts away all the spatial positioning and interaction logic and serves as an index for the spatial data.

The mental model of the Playgrounds should be absolutely positioned cards on the canvas.

Cards are fixed width but their height is only known at render time. Cards report their height when they first render to the Spatial Index.

The Spatial Index maintains a list of known rects for each card on the canvas, it extrapolates from that data what cards are stacked and maintains an order index based on a [Z-order curve](https://en.wikipedia.org/wiki/Z-order_curve) algorithm.

As the stacks only exist at runtime it’s important to note that the Card components themselves are designed to always end up with a height that’s a multiple of the grid size (8). This is very important and a consequence of the design. Knowing that, detecting stacks if figuring out if two cards are on the same x coordinate and exactly 8 pixels across from each other vertically.

This unfortunately means care must be taken when creating new card types and it’s trivial to break the stacking behavior or introduce bugs with small CSS changes. I believe in the model but it’s not a great fit for a browser where we have to measure heights post render.

### Rich Text

We use [Slate.js](https://docs.slatejs.org/) as the rich text editing library. This project predates [Lexical](https://github.com/facebook/lexical) which is why we didn’t use it. In the event of wanting to switch libraries it should be noted that the Slate data format is what we’re persisting directly in the database. It’s a very sane format though so serializing another in and out of another intermediate format should be doable.

Files of interest are `RTE.js` and `editorLib.js`

### Undo system

The undo system is a big part of the application as it’s a non-trivial problem. We based the undo system on immer patches which report mutations as data structures. For example:

```
{"op": "remove", "path": ["cards", 3]} // 3rd card was removed
```

We record forward and backward patches whenever a mutation happens in the system that’s tagged as undoable by specifying an undo stack ID (generally the document ID).

Note that the mutations to a rich text editor doesn’t go through this undo system. That’s because each RTE already has a robust undo system of it’s own. We create an undoable mutation when the note card loses focus so if you make 5 changes to the text of a note card and deselect the card and hit undo you’ll go back 5 steps. If you were to undo after making the 5th text edit you’d go back 1 text edit.

**Dirty Keys**

The concept of dirty keys relates to the sync engine but it factors into the undo system. We need to keep track of what cards, properties of the document etc changed so we may sync them back to the server. However we can’t be naive about it as an undo needs to also revert the impacted dirty keys list! So we keep track of the dirty keys along with the undo / redo patches. This will hopefully make more sense once you learn about how the sync engine works!

Files of interest are `undoLib.js` and the undo middleware in `store.js`

### Playground sync engine

We come to the point of needing to persist a mutation from the client side to the server. Historically the document was one giant JSON blob and we pushed the whole thing over the wall to the server on any mutation. This is not ideal for a number of reasons: slow, wasteful and it opens up the gates for all kinds of coordination issues especially when we mix in undo / redo, async latency and multiple open tabs for the same editor!

The solution was to have a more granular mutation API. On each mutation we keep track of what relevant keys changed (see Dirty Keys) and we schedule a sync call into the future that can be postponed by another immediate mutation. At some point we’ll flush the changes to the server as an array of changes. If this reminds you of the immer patches we use for the undo system you’d be right.

So an example payload for creating a card could be:

```
[
  {
    "key": "cards",
    "value": {
      "id": "9e0ce69d-4882-440c-b0c3-11021ffaa0a9",
      "type": "note",
      "body": [
        {
          "type": "paragraph",
          "children": [
            {
              "text": "test"
            }
          ]
        }
      ],
      "position": {
        "x": 448,
        "y": 104
      },
      "zIndex": 0,
      "createdAt": 1714605903,
      "updatedAt": 1714605903
    },
    "operation": "add"
  }
]
```

Then moving it:

```
{
  "changes": [
    {
      "key": "cards",
      "value": {
        "id": "9e0ce69d-4882-440c-b0c3-11021ffaa0a9",
        "type": "note",
        "body": [
          {
            "type": "paragraph",
            "children": [
              {
                "text": "test"
              }
            ]
          }
        ],
        "position": {
          "x": 224,
          "y": 232
        },
        "zIndex": 0,
        "createdAt": 1714605903,
        "updatedAt": 1714605951
      },
      "operation": "update"
    }
  ],
  "ifNotModifiedSince": "2024-05-01T23:25:05.935419+00:00"
}
```

Note that we make an effort to collapse mutations into as few as possible so there was not a create with an empty note card and then an edit with text value because the edit happened faster than the sync call went out and the two got smooshed into one.

In theory this sync engine is powerful enough to power concurrent editing if we had the ability to lock edits to a specific card to one actor. We’re also missing a real time update channel to enable pushing changes from server back to the client so we never pushed in this direction.

Files of interest are `doDocumentsSync` in `store.js`
