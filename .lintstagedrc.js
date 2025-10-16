export default {
  "**/*.{js,jsx,ts,tsx,json,yml,yaml}": ["prettier --write"],
  "**/*.md": (files) => {
    // Filter out changeset files - they need special handling
    const nonChangesetFiles = files.filter(
      (file) => !file.includes(".changeset/"),
    );
    if (nonChangesetFiles.length === 0) return [];
    // Use -o flag (no path) to write back to same file
    return nonChangesetFiles.map(
      (file) => `remark ${file} --use remark-gfm --use remark-github -o`,
    );
  },
  "!**/pnpm-lock.yaml": [],
  "!**/package-lock.json": [],
  "!**/yarn.lock": [],
  ".changeset/*.md": (files) => {
    // Only run changeset linter on changeset files
    return files.map((file) => `pnpm changeset-lint check-file ${file}`);
  },
};
