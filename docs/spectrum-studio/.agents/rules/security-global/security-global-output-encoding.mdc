---
description: USE WHEN rendering user data in HTML, JavaScript, SQL, URLs, or other output contexts
alwaysApply: false
---
# Output Encoding & Escaping

Output encoding and parameterization are critical controls for stopping injection attacks. Use context-specific encoding whenever untrusted data is rendered, and pair it with parameterized interfaces for SQL, shell, or LDAP operations. This requirement is distinct from input validation.

All violations must include a clear explanation of which rule was triggered and why.

## Critical: Output Encoding ≠ Input Validation

**Input validation alone does NOT prevent injection attacks.**

- **Input Validation**: Ensures data is well-formed before entering system
- **Output Encoding**: Prevents injection by encoding data for output context

## Context-Specific Encoding

Encoding method MUST match output context. Wrong encoding = vulnerability.

### 1. HTML Context
Inserting into HTML body: Encode `& < > " ' /`

### 2. HTML Attribute Context
- Always quote attributes
- Use HTML attribute encoding
- Never use event handlers: `onclick`, `onerror`, `onload`
- Avoid `href` with `javascript:` URLs

### 3. JavaScript Context
- Use JSON encoding for data (e.g., JSON.stringify) before inserting untrusted values.
- When embedding JSON in <script> tags, escape < (\u003c) at minimum, and also escape & (\u0026) and the Unicode line/paragraph separators (\u2028, \u2029) to block script-breakout payloads
- Prefer <script type="application/json"> with textContent; parse later instead of concatenating data into executable scripts.
- Avoid inline scripts, event handler attributes, and javascript: URLs for untrusted data.
- Layer with CSP for defense in depth, but never treat it as a substitute for correct encoding.

### 4. CSS Context
Avoid entirely - extremely dangerous.
If unavoidable: Use CSS hex escaping.
Prefer allowlist validation for class names.

### 5. URL Context
- Use URL/percent encoding
- Allowlist protocols: `https:`, `http:`, `mailto:`
- Block: `javascript:`, `data:`, `vbscript:`

### 6. SQL Context
PRIMARY defense: Parameterized queries / Prepared statements.
Never rely on escaping alone.

### 7. Command/Shell Context
Best: Avoid shell execution - use direct API calls.
If unavoidable: Use argument arrays, strict allowlisting, shell escaping.

### 8. XML Context
Encode: `& < > " '`

### 9. LDAP Context
Encode special characters: `* ( ) \ NUL`
Use parameterized queries when available.

### 10. JSON Context
Use proper JSON encoding libraries.
Never manually construct JSON strings.

## Framework Auto-Escaping

Modern frameworks auto-escape in templates. Know when it's disabled:
- Raw HTML directives
- Unsafe filters
- Direct DOM manipulation

## Content Security Policy (CSP)

Implement as defense-in-depth.
Blocks inline scripts, restricts resource sources.
NOT a replacement for output encoding - both required.

## Rich Text / HTML Content

Use HTML sanitization libraries:
- Allowlist tags and attributes
- Remove JavaScript/event handlers
- Remove script tags
- Validate URLs

Alternative: Use Markdown, convert server-side, sanitize output.

## Anti-Patterns

1. Using input validation instead of output encoding for XSS
2. Using same encoding for all contexts
3. Writing custom encoding (use framework/library)
4. Encoding once and storing (encode at output time)
5. Trusting auto-escaping without understanding when it applies
6. Using denylist filtering instead of encoding
7. Stripping tags instead of encoding
8. Double-encoding or incorrect order
9. Forgetting JSON/AJAX response encoding
10. Not encoding error messages

## Best Practices

1. Encode at output time (not input/storage)
2. Context-specific encoding
3. Use framework features
4. Defense in depth (combine with CSP, input validation)
5. Encode all untrusted data (including from databases)
6. Test encoding (include XSS test cases)
7. Never trust data source
8. Encode in error messages
9. Review template code
10. Use static analysis

## Encoding vs Sanitization

- **Encoding/Escaping**: Transform data to be safe for context
- **Sanitization**: Remove/modify dangerous content (for rich content)

For most cases: Use encoding/escaping, not sanitization.

## Testing

Test with payloads in all contexts:
- HTML body/attributes
- JavaScript blocks
- JSON responses
- Error messages
- Log files (if displayed)