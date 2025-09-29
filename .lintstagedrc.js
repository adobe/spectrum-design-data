export default {
  "**/*.{js,jsx,ts,tsx,json,yml,yaml}": ["prettier --write"],
  "**/*.md": (files) => {
    // Filter out changeset files
    const nonChangesetFiles = files.filter(
      (file) => !file.includes(".changeset/"),
    );
    if (nonChangesetFiles.length === 0) return [];
    return nonChangesetFiles.map(
      (file) => `remark --use remark-gfm --use remark-github --output ${file}`,
    );
  },
  "!**/pnpm-lock.yaml": [],
  "!**/package-lock.json": [],
  "!**/yarn.lock": [],
  ".changeset/*.md": (files) => {
    return files.map(
      (file) =>
        `cd /Users/garthdb/Spectrum/spectrum-tokens && pnpm changeset-lint check-file ${file}`,
    );
  },
};
