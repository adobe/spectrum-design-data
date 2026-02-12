export default {
  "**/*.{js,jsx,ts,tsx,json,yml,yaml}": ["prettier --write"],
  "**/*.md": (files) => {
    // Filter out changeset and CHANGELOG files - they need special handling
    const processableFiles = files.filter(
      (file) => !file.includes(".changeset/") && !file.includes("CHANGELOG.md"),
    );
    if (processableFiles.length === 0) return [];
    // Use -o flag (no path) to write back to same file
    return processableFiles.map(
      (file) =>
        `remark ${file} --use remark-frontmatter --use remark-gfm --use remark-github -o`,
    );
  },
  "!**/pnpm-lock.yaml": [],
  "!**/package-lock.json": [],
  "!**/yarn.lock": [],
  ".changeset/*.md": (files) => {
    // Only run changeset linter on actual changeset files, not README.md
    const changesetFiles = files.filter((file) => !file.endsWith("README.md"));
    if (changesetFiles.length === 0) return [];
    return changesetFiles.map(
      (file) => `pnpm changeset-lint check-file ${file}`,
    );
  },
};
