---
description: USE WHEN processing user input, form data, API requests, or data from external sources
alwaysApply: false
---
# Input Validation

Proper input validation is the first line of defense against malformed or unexpected data, reducing the attack surface before deeper security controls handle injection or context-specific risks.

## Key Principles

- **Validate on both sides**: Implement validation on both client and server
- **Whitelist over blacklist**: Prefer allowlist approaches over trying to block known bad inputs
- **Defense in depth**: Apply multiple validation layers
- **Validate before use**: Validate input as close as possible to where it's used

## Input Validation Techniques

### Type Checking

- Enforce strong typing
- Validate data types before processing
- Use schema validation where appropriate

### Format Validation

- Validate using patterns/regex for format-specific inputs
- Implement strict validation for sensitive fields (email, phone, etc.)
- Validate ranges, lengths, and sizes

### Sanitization

- Sanitize data before storage or display
- Remove/escape potentially dangerous characters
- Use context-appropriate encoding when outputting

## Anti-Patterns to Avoid

- Using client-side validation only
- Relying only on blacklists
- Validating only on form submission
- Skipping validation for "trusted" sources
- Implementing custom validation for standard formats