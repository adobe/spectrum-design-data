// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Nav links to sibling platform builds. A multi-platform deployment publishes
// platforms.json one level above each build; a single local build has none, so
// any failure returns "" and the nav stays as it was.

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export async function platformSwitcher(platform, component, load = fetch) {
  if (!platform) return "";
  try {
    const res = await load("../platforms.json");
    if (!res.ok) return "";
    const all = await res.json();
    if (!Array.isArray(all)) return "";
    const query = component ? `?c=${encodeURIComponent(component)}` : "";
    const links = all
      .filter((p) => p && p.id !== platform.id && p.label && p.path)
      .map(
        (p) =>
          `<li><a href="../${esc(p.path)}${query}">${esc(p.label)}</a></li>`,
      );
    links.push('<li><a href="../">All platforms</a></li>');
    return `<div><h4>Platforms</h4><ul>${links.join("")}</ul></div>`;
  } catch {
    return "";
  }
}
