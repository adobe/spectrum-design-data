/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// ponytail: plain category toggle, no framework. Add real search/pagination
// only once post volume makes a flat filtered list hard to scan.
(function () {
  var buttons = document.querySelectorAll(".article-filters [data-filter]");
  var cards = document.querySelectorAll(".article-card[data-category]");

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (b) {
        b.classList.remove("is-active");
      });
      button.classList.add("is-active");

      var filter = button.dataset.filter;
      cards.forEach(function (card) {
        card.hidden = filter !== "all" && card.dataset.category !== filter;
      });
    });
  });
})();
