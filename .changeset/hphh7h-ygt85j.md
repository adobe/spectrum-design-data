---
"@adobe/design-data": patch
"@adobe/design-data-darwin-arm64": patch
"@adobe/design-data-darwin-x64": patch
"@adobe/design-data-linux-x64": patch
"@adobe/design-data-win32-x64": patch
---

Fix CI release workflow: run `sdk:codegen` on all platforms to avoid a
Windows CRLF line-ending mismatch in `codegen-check`.
