<!-- Copyright 2026 Adobe. All rights reserved. -->

<!-- This file is licensed to you under the Apache License, Version 2.0. -->

# Figma Code Connect

Builds Figma Code Connect UI mappings from the canonical component declarations
in `packages/design-data/components`. It only includes top-level component
declarations with an `implementations` array and derives prop hints directly
from their camelCase `options` keys.

```sh
pnpm --filter figma-code-connect plan
```

The default command is a safe dry run that prints compact mapping inputs:
component source/package, exported component name, explicit platform, Code
Connect label, and prop hints. The tool maps known Spectrum Web Components and
React Spectrum packages to their respective UI labels. For another platform,
provide its label explicitly:

```sh
pnpm --filter figma-code-connect plan --label ios=SwiftUI
```

## Applying mappings

`--apply` connects to the local Figma Dev Mode MCP endpoint configured in
`.mcp.json`. It checks existing mappings for every matched Figma component,
skips existing label mappings, and submits only the remaining mappings in
batches of ten. Existing-map checks are parallelized within each batch.

```sh
pnpm --filter figma-code-connect plan --apply \
  --figma-components scratch-library-components.json
```

The current local Figma MCP server does not expose
`list_file_components_for_code_connect`, so live apply requires a compact
exported node list (`[{ "nodeId": "123:456", "name": "Button" }]`). The
generator feature-detects required read/write tools and fails before mutation
when the server is unavailable or incomplete. It calls native enumeration
directly when a server exposes that tool. Component responses are reduced to
node IDs and names before matching; the script never passes Figma response
bloat such as icon references to an LLM.

Platform routing comes from `implementations[].platform`; package prefixes are
only mapped locally to Code Connect's required framework labels. The script
does not rely on Figma to infer a platform from a path.
