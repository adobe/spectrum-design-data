/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2023 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/
import { cout } from "./helpers";
/**
 * Send component options data for the current page to the UI.
 * Called on init and when page changes.
 */
function sendCurrentPageData() {
  const componentOptionsData = figma.currentPage.getPluginData("copts");
  if (componentOptionsData) {
    figma.ui.postMessage({
      componentOptionsData: JSON.parse(componentOptionsData),
    });
    cout(`Backend: sent component data for page "${figma.currentPage.name}"`);
  } else {
    // Send empty data for new/blank pages
    figma.ui.postMessage({
      componentOptionsData: {
        title: "",
        meta: {
          category: "",
          documentationUrl: "",
        },
        options: [],
      },
    });
    cout(
      `Backend: sent empty data for page "${figma.currentPage.name}" (no saved data)`,
    );
  }
}
async function initUI() {
  cout("Backend: Init UI");
  // This shows the HTML page in "ui.html".
  figma.showUI(__html__, { width: 900, height: 500 });
  // Listen for page changes and update UI with new page's data
  figma.on("currentpagechange", () => {
    cout(`Backend: page changed to "${figma.currentPage.name}"`);
    sendCurrentPageData();
  });
  figma.ui.onmessage = async (msg) => {
    cout("Backend: received message => " + JSON.stringify(msg));
    // when UI is ready, send the initial data to be shown in the UI
    if (msg.type === "init-complete") {
      // send component options data for current page
      sendCurrentPageData();
      // send system options data (stored at document level, not page level)
      const systemOptionsData = figma.root.getPluginData("systemOptions");
      if (systemOptionsData) {
        figma.ui.postMessage({
          systemOptionsData: JSON.parse(systemOptionsData),
        });
        cout("Backend: sent system options to UI");
      }
      // If no system options stored, UI will use defaults
      cout("Backend: posted message to UI");
    }
    // when user cancels the UI
    if (msg.type === "cancel") {
      figma.ui.close();
      const closePluginMessage = "Canceled";
      closePluginWindow(closePluginMessage);
    }
    // Handle window resize requests from UI
    if (msg.type === "resize-window") {
      figma.ui.resize(msg.width, msg.height);
    }
    // when user executes
    if (msg.type === "do-something") {
      cout(`got data from ui: ${msg}`);
      // figma.ui.close();
      // run something
    }
    if (msg.type === "update-component") {
      // Build component data object without 'type' field
      const componentData = {
        title: msg.title,
        meta: msg.meta,
        options: msg.options,
      };
      figma.currentPage.setPluginData("copts", JSON.stringify(componentData));
      console.log(figma.currentPage.getPluginData("copts"));
    }
    // Handle system options updates (stored at document level)
    if (msg.type === "update-system-options") {
      const systemOptionsData = {
        systemOptions: msg.systemOptions,
      };
      figma.root.setPluginData(
        "systemOptions",
        JSON.stringify(systemOptionsData),
      );
      cout("Backend: saved system options");
    }
  };
  cout("Backend: Complete Init UI");
}
async function main() {
  try {
    await initUI();
  } catch (error) {
    cout(error);
  }
}
async function plugin() {
  await main();
}
function closePluginWindow(message) {
  figma.closePlugin(message);
}
if (figma.editorType === "figma") {
  plugin();
}
//# sourceMappingURL=plugin.js.map
