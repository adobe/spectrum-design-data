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

(function () {
  // Spectrum 2 workflow icons (Copy, Checkmark). Paths inherit the button's
  // currentColor via .spectrum-Icon { fill: currentColor }.
  const COPY_ICON =
    '<path d="m11.75,18h-7.5c-1.24023,0-2.25-1.00977-2.25-2.25v-7.5c0-1.24023,1.00977-2.25,2.25-2.25.41406,0,.75.33594.75.75s-.33594.75-.75.75c-.41309,0-.75.33691-.75.75v7.5c0,.41309.33691.75.75.75h7.5c.41309,0,.75-.33691.75-.75,0-.41406.33594-.75.75-.75s.75.33594.75.75c0,1.24023-1.00977,2.25-2.25,2.25Z"/><path d="m6.75,5c-.41406,0-.75-.33594-.75-.75,0-1.24023,1.00977-2.25,2.25-2.25.41406,0,.75.33594.75.75s-.33594.75-.75.75c-.41309,0-.75.33691-.75.75,0,.41406-.33594.75-.75.75Z"/><path d="m13,3.5h-2c-.41406,0-.75-.33594-.75-.75s.33594-.75.75-.75h2c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"/><path d="m13,14h-2c-.41406,0-.75-.33594-.75-.75s.33594-.75.75-.75h2c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"/><path d="m15.75,14c-.41406,0-.75-.33594-.75-.75s.33594-.75.75-.75c.41309,0,.75-.33691.75-.75,0-.41406.33594-.75.75-.75s.75.33594.75.75c0,1.24023-1.00977,2.25-2.25,2.25Z"/><path d="m17.25,5c-.41406,0-.75-.33594-.75-.75,0-.41309-.33691-.75-.75-.75-.41406,0-.75-.33594-.75-.75s.33594-.75.75-.75c1.24023,0,2.25,1.00977,2.25,2.25,0,.41406-.33594.75-.75.75Z"/><path d="m17.25,9.75c-.41406,0-.75-.33594-.75-.75v-2c0-.41406.33594-.75.75-.75s.75.33594.75.75v2c0,.41406-.33594.75-.75.75Z"/><path d="m6.75,9.75c-.41406,0-.75-.33594-.75-.75v-2c0-.41406.33594-.75.75-.75s.75.33594.75.75v2c0,.41406-.33594.75-.75.75Z"/><path d="m8.25,14c-1.24023,0-2.25-1.00977-2.25-2.25,0-.41406.33594-.75.75-.75s.75.33594.75.75c0,.41309.33691.75.75.75.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"/>';
  const CHECK_ICON =
    '<path d="M7.86426,15.73438c-.22266,0-.43359-.09863-.57617-.26953l-3.74707-4.49805c-.26562-.31836-.22168-.79199.0957-1.05664.31738-.26562.79004-.22363,1.05664.0957l3.15332,3.78613,7.43945-9.46875c.25586-.32617.72852-.38184,1.05273-.12695.32617.25586.38281.72754.12695,1.05273l-8.01172,10.19824c-.13965.17871-.35254.28418-.5791.28711h-.01074Z"/>';

  function icon(paths) {
    return (
      '<svg class="spectrum-Icon spectrum-Icon--sizeS spectrum-ActionButton-icon" ' +
      'width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true">' +
      paths +
      "</svg>"
    );
  }

  function addCopyButtons() {
    const blocks = document.querySelectorAll("article pre");

    blocks.forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code || pre.parentElement.classList.contains("code-block")) return;

      // Wrap each <pre> so the button can sit outside the scrollable region.
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "spectrum-ActionButton spectrum-ActionButton--sizeS spectrum-ActionButton--quiet code-block-copy";
      button.setAttribute("aria-label", "Copy code to clipboard");
      button.innerHTML = icon(COPY_ICON);
      wrapper.appendChild(button);

      let resetTimer;
      button.addEventListener("click", () => {
        window.clearTimeout(resetTimer);

        const showCopied = () => {
          button.innerHTML = icon(CHECK_ICON);
          button.classList.add("is-copied");
          button.setAttribute("aria-label", "Copied");
          resetTimer = window.setTimeout(() => {
            button.innerHTML = icon(COPY_ICON);
            button.classList.remove("is-copied");
            button.setAttribute("aria-label", "Copy code to clipboard");
          }, 2000);
        };

        navigator.clipboard.writeText(code.textContent).then(showCopied, () => {
          button.setAttribute("aria-label", "Copy failed \u2014 press \u2318C");
          resetTimer = window.setTimeout(
            () => button.setAttribute("aria-label", "Copy code to clipboard"),
            2000,
          );
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addCopyButtons);
  } else {
    addCopyButtons();
  }
})();
