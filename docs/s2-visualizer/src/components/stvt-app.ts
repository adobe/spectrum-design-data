/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";
import { GraphController } from "../controllers/graph-controller";
import { GraphModel, GraphState } from "../models/graph-model";
import { AppController } from "../controllers/app-controller";
import { AppModel, AppState } from "../models/app-model";
import { StringMatchDictionaryItem } from "../workers/string-match";

import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/scale-medium.js";
import "@spectrum-web-components/theme/theme-dark.js";
import "@spectrum-web-components/theme/theme-light.js";
import "@spectrum-web-components/toast/sp-toast.js";

import "./token-graph";

// import './stvt-toolbar'

import "./stvt-sidebar";

import "./stvt-hud";

/*

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::.oooooo..o:ooooooooooooo:oooooo:::::oooo:ooooooooooooo::::::
:::::d8P'::::`Y8:8':::888:::`8::`888.:::::.8'::8':::888:::`8::::::
:::::Y88bo.:::::::::::888::::::::`888.:::.8'::::::::888:::::::::::
::::::`"Y8888o.:::::::888:::::::::`888.:.8':::::::::888:::::::::::
::::::::::`"Y88b::::::888::::::::::`888.8'::::::::::888:::::::::::
:::::oo:::::.d8P::::::888:::::::::::`888':::::::::::888:::::::::::
:::::8""88888P'::::::o888o:::::::::::`8':::::::::::o888o::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::┌──────┐:::::┌──────┐:::┌──────┐::::::::::
::::::::::::::::::┌────▶│      │────▶│      │──▶│      │::::::::::
::::::┌──────┐::::│:::::└──────┘:::::└──────┘:::└──────┘::::::::::
::::::│      │────┤:::::::::::::::::::::::::::::::::::::::::::::::
::::::└──────┘::::│:::::┌──────┐::::::::::::::::::::::::::::::::::
::::::::::::::::::└────▶│      │───────┐::::::::::::::::::::::::::
::::::::::::::::::::::::└──────┘:::::::│::::::::┌──────┐::::::::::
:::::::::::::::::::::::::::::::::::::::├───────▶│      │::::::::::
::::::::::::::::::::::::┌──────┐:::::::│::::::::└──────┘::::::::::
::::::::::::::::::::::::│      │───────┘::::::::::::::::::::::::::
::::::::::::::::::::::::└──────┘::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

  This web component is the entry point for the
  Spectrum Token Visualization Tool webapp

  Here, we initialize our Models and Controllers
  and bind our application state to the
  web components that make up the views.

  We use a one-way data flow for sending state
  into our views through our top level
  graphState and appState model representations,
  which are readonly json objects dumped
  out of our GraphModel and AppModel respectively.

  Those models are mutated only via calls to our
  GraphController and AppController which have
  semantic methods for performing interesting
  actions for our app.

  To capture user interaction, views are
  able to use a dispatch-custom-event utility
  for emitting arbitrary events/payload up
  the DOM tree natively to be captured via
  an @{EVENT_NAME} binding on stvt-app component
  at the root of the application and routed
  to the appropriate App/Graph Controllers for
  processing and mutation of model state.

  LOCAL DEVELOPMENT NOTE:
  Because we use web workers to offload some
  of the data processing, LOCAL development
  must be done in a browser that supports
  Worker Ecmascript Modules:
  https://caniuse.com/mdn-api_worker_worker_ecmascript_modules
  In other words: NOT firefox ( as of 12.15.2022 )
  See vite git issues for more info:
  https://github.com/vitejs/vite/issues/4586

*/

export class StvtApp extends LitElement {
  @property({ type: Object }) graphState =
    GraphModel.DEFAULT_STATE as GraphState;
  @property({ type: Object }) appState = AppModel.DEFAULT_STATE as AppState;
  @property({ type: Object }) dictionary = [] as StringMatchDictionaryItem[];
  @property({ type: Boolean }) showAlert = false;
  @property({ type: String }) alertMessage = "Alert!";

  alertKey: string = "";
  graphController: GraphController;
  appController: AppController;
  urlParamComponent = "";
  urlParamToken = "";
  urlParamFilter = "";
  urlParams: URLSearchParams;

  static styles = css`
    :host {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco,
        Consolas, "Liberation Mono", "Courier New", monospace;
      position: absolute;
      display: block;
      top: 0;
      left: 0;
      width: 100%;
      min-height: 100%;
      overflow: hidden;
      /* background: rgb(34,34,66); */
      /* background: #000000;
      color: #FFFFFF; */
    }

    stvt-sidebar {
      z-index: 2;
      left: 0;
      opacity: 1;
      transition:
        opacity 0.25s,
        left 0.25s;
    }

    stvt-tabs {
      z-index: 1;
      opacity: 1;
      top: 0;
      transition:
        opacity 0.25s,
        top 0.25s;
    }

    .fullscreen-mode stvt-sidebar {
      opacity: 0;
      left: -50px;
      pointer-events: none;
    }

    .fullscreen-mode stvt-tabs {
      opacity: 0;
      top: -25px;
      pointer-events: none;
    }

    token-graph {
      z-index: 0;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    sp-toast {
      position: absolute;
      top: 110px;
      left: 50%;
      z-index: 3;
      left: 50%;
      transform: translate(-50%, 0);
    }
  `;

  constructor() {
    super();
    this.urlParams = new URLSearchParams(window.location.search);
    this.urlParamComponent = this.urlParams.get("component") || "";
    this.urlParamToken = this.urlParams.get("token") || "";
    this.urlParamFilter = this.urlParams.get("filter") || "";
    // this.urlParamExpand = this.urlParams.get('expand') || '';
    this.graphController = new GraphController();
    const initialTokens = this.urlParamToken.split(",");
    const initialComponents = this.urlParamComponent.split(",");
    const initialFilters = this.urlParamFilter.split(",");

    if (initialTokens.length === 1 && initialTokens[0] === "") {
      initialTokens.pop();
    }
    if (initialComponents.length === 1 && initialComponents[0] === "") {
      initialComponents.pop();
    }
    if (initialFilters.length === 1 && initialFilters[0] === "") {
      initialFilters.pop();
    }

    // only inject default filters if there is NO filter parameter
    // this allows us to persist the 'no filters' state via
    // a url like this... http://stvt.adobe.com/?filter=
    if (!this.urlParams.has("filter")) {
      initialFilters.push("spectrum", "light", "desktop");
    }

    this.appController = new AppController({
      graphController: this.graphController,
      selectedComponents: initialComponents,
      selectedTokens: initialTokens,
      setFilters: initialFilters,
    });

    this.graphController.onDictionaryAvailable(
      (newDictionary: StringMatchDictionaryItem[]) =>
        (this.dictionary = newDictionary),
    );
    this.graphController.onNewGraphState(
      (newGraphState: GraphState) => (this.graphState = newGraphState),
    );
    this.appController.onNewAppState((newAppState: AppState) => {
      this.appState = newAppState;
    });

    this.graphState = this.graphController.displayGraphModel.state;
    this.appState = this.appController.appModel.state;

    window.addEventListener(
      "popstate",
      () => {
        this.urlParams = new URLSearchParams(window.location.search);
        this.urlParamComponent = this.urlParams.get("component") || "";
        this.urlParamToken = this.urlParams.get("token") || "";
        this.urlParamFilter = this.urlParams.get("filter") || "";
        const newTokens = this.urlParamToken.split(",");
        const newComponents = this.urlParamComponent.split(",");
        const newFilters = this.urlParamFilter.split(",");
        if (newTokens.length === 1 && newTokens[0] === "") {
          newTokens.pop();
        }
        if (newComponents.length === 1 && newComponents[0] === "") {
          newComponents.pop();
        }
        if (newFilters.length === 1 && newFilters[0] === "") {
          newFilters.pop();
        }
        this.appController.appModel.setSelectedComponents(newComponents);
        this.appController.appModel.setSelectedTokens(newTokens);
        this.appController.appModel.setSetFilters(newFilters);
        this.appController.emitNewAppState();
      },
      false,
    );

    window.addEventListener("keydown", (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyZ":
          this.appController.handleEvent("set-zoom-centered-on-canvas", {
            value: this.appState.zoom * (e.shiftKey ? 0.8 : 1.2),
          });
          break;
        case "ArrowUp":
          this.appController.handleEvent("set-panning-position", {
            x: this.appState.panX,
            y: this.appState.panY + 30 * (e.shiftKey ? 10 : 1),
          });
          break;
        case "ArrowDown":
          this.appController.handleEvent("set-panning-position", {
            x: this.appState.panX,
            y: this.appState.panY - 30 * (e.shiftKey ? 10 : 1),
          });
          break;
        case "ArrowLeft":
          this.appController.handleEvent("set-panning-position", {
            x: this.appState.panX + 30 * (e.shiftKey ? 10 : 1),
            y: this.appState.panY,
          });
          break;
        case "ArrowRight":
          this.appController.handleEvent("set-panning-position", {
            x: this.appState.panX - 30 * (e.shiftKey ? 10 : 1),
            y: this.appState.panY,
          });
          break;
        case "KeyF":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            try {
              const sidebarEl = this.shadowRoot?.getElementById(
                "stvt-sidebar",
              ) as HTMLElement;
              const searchEl = sidebarEl.shadowRoot?.getElementById(
                "stvt-search",
              ) as HTMLElement;
              const inputEl = searchEl.shadowRoot?.getElementById("search");
              inputEl?.focus();
            } catch (e) {
              console.info(
                "failed to traverse shadow dom looking for search input to focus",
              );
            }
          }
          break;
        default:
      }
    });
  }

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("appState")) {
      let didUrlParamsChange = false;
      const encodedComponents = this.appState.selectedComponents.join(",");
      const encodedTokens = this.appState.selectedTokens.join(",");
      const encodedFilters = this.appState.setFilters.join(",");

      if (encodedComponents !== this.urlParamComponent) {
        this.urlParamComponent = encodedComponents;
        if (encodedComponents === "") {
          this.urlParams.delete("component");
        } else {
          this.urlParams.set("component", encodedComponents);
        }
        didUrlParamsChange = true;
      }

      if (encodedTokens !== this.urlParamToken) {
        this.urlParamToken = encodedTokens;
        if (encodedTokens === "") {
          this.urlParams.delete("token");
        } else {
          this.urlParams.set("token", encodedTokens);
        }
        didUrlParamsChange = true;
      }

      if (encodedFilters !== this.urlParamFilter) {
        this.urlParamFilter = encodedFilters;
        if (encodedFilters === "") {
          // this.urlParams.delete('filter');
          this.urlParams.set("filter", encodedFilters);
        } else {
          this.urlParams.set("filter", encodedFilters);
        }
        didUrlParamsChange = true;
      }

      if (didUrlParamsChange) {
        // window.history.replaceState({}, '', `${location.pathname}?${this.urlParams}`);
        window.history.pushState(
          {},
          "",
          `${location.pathname}?${this.urlParams}`,
        );
      }
    }
  }

  async handleCopiedToClipboard(e: CustomEvent) {
    this.showAlert = true;
    const tokenName = e.detail.id;
    this.alertMessage = `${tokenName} copied to clipboard.`;
    this.alertKey = tokenName;
    setTimeout(() => {
      if (this.alertKey === tokenName) {
        this.showAlert = false;
      }
    }, 2500);
  }

  render() {
    return html`
      <sp-theme
        scale="medium"
        color=${this.appState.spectrumColorTheme}
        class=${this.appState.fullscreenMode ? "fullscreen-mode" : ""}
      >
        <stvt-sidebar
          id="stvt-sidebar"
          @gesturechange=${(e: any) => e.preventDefault()}
          @gesturestart=${(e: any) => e.preventDefault()}
          @gestureend=${(e: any) => e.preventDefault()}
          @set-spectrum-color-theme=${(e: CustomEvent) =>
            this.appController.handleEvent(
              "set-spectrum-color-theme",
              e.detail,
            )}
          @filters-selected=${(e: CustomEvent) =>
            this.appController.handleEvent("filters-selected", e.detail)}
          @select-id=${(e: CustomEvent) =>
            this.appController.handleEvent("select-id", e.detail)}
          .dictionary=${this.dictionary}
          .filters=${this.appState.setFilters}
          .spectrumColorTheme=${this.appState.spectrumColorTheme}
        ></stvt-sidebar>
        <stvt-tabs
          @gesturechange=${(e: any) => e.preventDefault()}
          @gesturestart=${(e: any) => e.preventDefault()}
          @gestureend=${(e: any) => e.preventDefault()}
          @close-tab=${(e: CustomEvent) =>
            this.appController.handleEvent("close-tab", e.detail)}
          @close-all-tabs=${(e: CustomEvent) =>
            this.appController.handleEvent("close-all-tabs", e.detail)}
          .dictionary=${this.dictionary}
          .selectedTokens=${this.appState.selectedTokens}
          .selectedComponents=${this.appState.selectedComponents}
        ></stvt-tabs>
        <token-graph
          @set-zoom=${(e: CustomEvent) =>
            this.appController.handleEvent("set-zoom", e.detail)}
          @set-panning-position=${(e: CustomEvent) =>
            this.appController.handleEvent("set-panning-position", e.detail)}
          @panning-input-delta=${(e: CustomEvent) =>
            this.appController.handleEvent("panning-input-delta", e.detail)}
          @node-click=${(e: CustomEvent) =>
            this.appController.handleEvent("node-click", e.detail)}
          @node-dragmove=${(e: CustomEvent) =>
            this.graphController.handleEvent("node-dragmove", e.detail)}
          @node-pointerover=${(e: CustomEvent) =>
            this.appController.handleEvent("node-pointerover", e.detail)}
          @node-pointerout=${(e: CustomEvent) =>
            this.appController.handleEvent("node-pointerout", e.detail)}
          @node-dragstart=${(e: CustomEvent) =>
            this.appController.handleEvent("node-dragstart", e.detail)}
          @node-dragend=${(e: CustomEvent) =>
            this.appController.handleEvent("node-dragend", e.detail)}
          @generic-gesture-start=${(e: CustomEvent) =>
            this.appController.handleEvent("generic-gesture-start", e.detail)}
          @generic-gesture-end=${(e: CustomEvent) =>
            this.appController.handleEvent("generic-gesture-end", e.detail)}
          @copied-to-clipboard=${this.handleCopiedToClipboard}
          .graphState=${this.graphState}
          .appState=${this.appState}
        ></token-graph>
        <stvt-hud
          @set-zoom-centered-on-canvas=${(e: CustomEvent) =>
            this.appController.handleEvent(
              "set-zoom-centered-on-canvas",
              e.detail,
            )}
          @set-fullscreen-mode=${(e: CustomEvent) =>
            this.appController.handleEvent("set-fullscreen-mode", e.detail)}
          .fullscreenMode=${this.appState.fullscreenMode}
          .zoom=${this.appState.zoom}
        ></stvt-hud>
        <sp-toast ?open=${this.showAlert} variant="positive">
          ${this.alertMessage}
        </sp-toast>
      </sp-theme>
    `;
  }
}

customElements.define("stvt-app", StvtApp);
