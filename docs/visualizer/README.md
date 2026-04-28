# Spectrum Token Visualization Tool

Current url of deployed static site: <https://opensource.adobe.com/spectrum-design-data/visualizer/>

<img width="1491" alt="Screenshot 2023-02-28 at 2 40 02 PM" src="https://github.com/adobe/spectrum-design-data/assets/125516/3c57f2de-c42e-41a5-abed-e5da294339f0">

## Setup for local development

First, checkout the source code

```
git clone git@github.com:adobe/spectrum-design-data.git
```

Navigate into the spectrum-token-visualization-tool directory.

```
cd spectrum-design-data/docs/visualizer/
```

Install package dependencies

```
pnpm install
```

Startup the local development webserver

```
pnpm moon run visualizer:dev
```

Now you can edit any project files, and your browser will hot-reload with your changes.

This project is based on the Vite Lit Element Typescript boilerplate static site tooling.

You can read all about Vite here: <https://vitejs.dev/guide/>

You can read all about Lit Element here: <https://lit.dev/docs/api/LitElement/>

*LOCAL DEVELOPMENT NOTE*
Because we use web workers to offload some of the data processing, local development must be done in a browser that supports Worker Ecmascript Modules: <https://caniuse.com/mdn-api_worker_worker_ecmascript_modules>. In other words, you can use Chrome or Safari, but NOT Firefox ( as of 12.15.2022 ). This note applies ONLY to the local development webserver. Firefox does work correctly with the built static site.

## Updating the deployed static site

The static site is hosted from the `/docs` directory of the `main` branch.

Build the static site locally. This will overwrite the contents of the /docs directory in the project.

```
pnpm moon run visualizer:build
```

Commit the updated static site files to the git repo.

```
git add .

git commit -m 'description of changes'

git push
```

## What is this prototype? How does it work?

The Spectrum Tokens source-of-truth is persisted in this public GitHub repo: <https://github.com/adobe/spectrum-design-data>

Within that repository, the tokens are stored in a series of JSON files: <https://github.com/adobe/spectrum-design-data/tree/s1-legacy/packages/tokens/src>

This json data structure models a directed graph of conditional relationships between tokens, meant to represent the dynamic value assignments that Spectrum clients have access to when using particular filter configurations, such as 'Spectrum/Light/Desktop' or 'Express/Darkest/Mobile'.

This tool is a static site single page application that...

* Loads all of these JSON files via XHR requests at runtime
* Converts the token data into a formal node graph
* Has nodes representing Spectrum Tokens, Spectrum Components, and Spectrum Token Categories
* Has adjacencies between nodes derived from the source JSON files
* Renders a dynamic node graph view with zooming and panning
* Permits the user to simultaneously view any set of adjacency/value filters. eg.'Spectrum/Light/Desktop' or 'Express/Light/Dark/Darkest/Desktop/Mobile'
* Permits the user to select any combination of Components, Tokens, and Token Categories
* Permits the user to search for Components, Tokens, and Token Categories by substring OR value
* Displays the expanded Ancestor and Descendent graphs of all selected nodes
* Highlights the connecting token paths between selections
* Highlights the common tokens within overlapping selection descendent graphs
