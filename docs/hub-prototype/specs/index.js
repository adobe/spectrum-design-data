// Copyright 2026 Adobe. All rights reserved.

// Lists every generated sheet from data/sheets/index.json (`design-data spec-sheet --all`):
// version and latest release come from each component's changelog, and the visual flag from
// the sheet. The page reads those fields and derives nothing.

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const FIGMA_TIP =
  "Generated Figma spec file. It is in a test folder, so only people with access can open it.";
const figmaUrl = (e) =>
  `https://www.figma.com/design/${encodeURIComponent(e.fileKey)}`;
const figmaFiles = await fetch("data/figma-files.json")
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);
const figmaFile = (c) =>
  figmaFiles?.files?.[c]?.fileKey ? figmaFiles.files[c] : null;
const res = await fetch("data/sheets/index.json");
if (!res.ok) {
  document.getElementById("summary").textContent =
    "No sheets yet. Run the hub-prototype build to generate them.";
  throw new Error(`data/sheets/index.json: ${res.status}`);
}
const { components } = await res.json();
const full = components.filter((c) => c.visual).length;
document.getElementById("summary").textContent =
  `${components.length} components: ${full} with a visual, ${components.length - full} table-only`;
document.getElementById("index").innerHTML =
  "<thead><tr><th>Component</th><th>Version</th><th>Latest release</th><th>Visual</th><th>Blocks</th><th>Figma</th></tr></thead><tbody>" +
  components
    .map((c) => {
      const rel = c.latestRelease;
      const fig = figmaFile(c.component);
      return `<tr><td><a href="sheet.html?component=${encodeURIComponent(c.component)}">${esc(c.displayName)}</a></td><td>${esc(c.version ?? "–")}</td><td>${rel ? `${esc(rel.release)} <small>${esc(rel.bump ?? "first")} · ${esc(rel.date)}</small>` : "none yet"}</td><td>${c.visual ? '<span class="chip visual">visual</span>' : '<span class="chip">No visual recipe yet</span>'}</td><td>${c.blocks}</td><td>${fig ? `<a href="${esc(figmaUrl(fig))}" target="_blank" rel="noopener" title="${esc(FIGMA_TIP)}">Open Figma spec file</a>` : "–"}</td></tr>`;
    })
    .join("") +
  "</tbody>";
