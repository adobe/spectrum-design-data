import { LitElement, html, css } from "lit";

import { property } from "lit/decorators.js";

import "@spectrum-web-components/field-group/sp-field-group.js";
import "@spectrum-web-components/field-label/sp-field-label.js";
import "@spectrum-web-components/switch/sp-switch.js";

import { dispatchCustomEvent } from "../utilities/index";

import {
  ORDERED_TOKEN_FILTER_CATEGORIES,
  CATEGORIZED_TOKEN_FILTERS,
  CATEGORIZED_TOKEN_FILTER_LABELS,
} from "../layout-consts";

export class StvtFiltersMenu extends LitElement {
  @property({ type: Object }) filters = [] as string[];

  static styles = css`

    :host {
      position: relative;
      display: block;
      padding-bottom: 20px;
    }

    sp-field-label {
      margin-top: 20px;
    }

    sp-switch {
      text-transform: capitalize;
    }
  `;

  handleFilterChange() {
    const wrapperEl = this.shadowRoot?.firstElementChild as HTMLElement;
    const switches = [...wrapperEl.getElementsByTagName("sp-switch")];
    const activeFilters: string[] = switches.reduce(
      (accumulator, currentValue) => {
        const element = currentValue as HTMLElement;
        if (currentValue.checked) {
          accumulator.push(element.getAttribute("value") || "");
        }
        return accumulator;
      },
      [] as string[],
    );

    dispatchCustomEvent(this, "filters-selected", {
      value: activeFilters,
    });
  }

  listOfOptions(category: string) {
    return CATEGORIZED_TOKEN_FILTERS[category].map(
      (filterName) => html`
      <sp-switch emphasized value=${filterName} ?checked=${
        this.filters.indexOf(filterName) >= 0
      }>${filterName}</sp-switch>
    `,
    );
  }

  get listOfCategorizedOptionLists() {
    return ORDERED_TOKEN_FILTER_CATEGORIES.map(
      (category) => html`
      <sp-field-label for=${category} size="xl">
        ${CATEGORIZED_TOKEN_FILTER_LABELS[category]}
      </sp-field-label>
      <sp-field-group selected="first" name=${category} id=${category} vertical>
        ${this.listOfOptions(category)}
      </sp-field-group>
    `,
    );
  }

  render() {
    return html`
      <div @change=${this.handleFilterChange}>
        ${this.listOfCategorizedOptionLists}
      </div>
    `;
  }
}

customElements.define("stvt-filters-menu", StvtFiltersMenu);
