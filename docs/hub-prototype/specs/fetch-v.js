// Copyright 2026 Adobe. All rights reserved.

// Every spec-sheet fetch carries the deploy's build id (`?v=<id>` from build-info.json, which is
// itself revalidated), so a redeploy that keeps file names cannot show stale sheets. Without
// build-info.json (a local build) fetches stay bare.
const id = await fetch("../build-info.json", { cache: "no-cache" })
  .then((r) => (r.ok ? r.json() : null))
  .then((b) => b?.buildId)
  .catch(() => null);

export const fetchV = (url) =>
  fetch(id ? `${url}${url.includes("?") ? "&" : "?"}v=${id}` : url);
