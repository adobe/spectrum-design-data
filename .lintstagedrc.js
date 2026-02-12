export default {
  "**/*.{js,jsx,ts,tsx,json,yml,yaml}": ["prettier --write"],
  "**/*.md": (files) => {
    // Filter out changeset and CHANGELOG files - they need special handling
    // Skip 11ty page templates so YAML frontmatter (---) is not reformatted by remark
    const processableFiles = files.filter(
      (file) =>
        !file.includes(".changeset/") &&
        !file.includes("CHANGELOG.md") &&
        !file.includes("docs/site/src/"),
    );
    if (processableFiles.length === 0) return [];
    // Use -o flag (no path) to write back to same file
    return processableFiles.map(
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
