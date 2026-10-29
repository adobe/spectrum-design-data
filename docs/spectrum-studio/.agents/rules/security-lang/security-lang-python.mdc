---
description: 
globs: **/*.py,**/*.ipynb,**/*.pyw
alwaysApply: false
---
These rules apply to all Python code in the repository and aim to prevent common security risks through disciplined handling of input validation, output encoding, safe execution, secure configuration, and dependency hygiene.

All violations must include a clear explanation of which rule was triggered and why, to help developers understand and fix the issue effectively.

If code is in violation:

* Add a comment explaining why.
* Reference the rule number.
* Suggest a compliant alternative.
* Do not generate code that violates these rules unless explicitly marked with `# security-reviewed`.

## 1. Validate All External Input

- **Rule:** All external input must be validated before being used in logic, database queries, file access, subprocess calls, or rendering.
* External input includes request data, CLI arguments, environment variables, file contents, deserialized payloads, and message queue data.
* Validation must use explicit type conversion, Pydantic models, regex allowlists, enums, or strict schema validation.
* Invalid input must be rejected — do not silently correct it.

---

## 2. Do Not Use User Input Directly in File Paths

* **Rule:** User-controlled input must not directly determine file paths.
* If input influences file access:

  * Use `pathlib`
  * Resolve against a fixed base directory
  * Prevent directory traversal (`..`)
  * Use allowlists where possible
* Never concatenate raw input into file paths.

---

## 3. Use Parameterized Database Queries

* **Rule:** Never construct SQL queries using string concatenation.
* Always use parameterized queries provided by the database driver.
* ORM usage must not interpolate user input directly into raw SQL.

---

## 4. Avoid `eval`, `exec`, and `compile` on Dynamic Input

* **Rule:** Do not use `eval()`, `exec()`, or `compile()` on any user-controllable input.
* No exceptions unless marked `# security-reviewed`.

---

## 5. Use Constant-Time Comparison for Secrets

* **Rule:** Use `hmac.compare_digest()` for comparing secrets such as tokens, passwords, or signatures.
* Never use `==` for secret comparison.

---

## 6. Do Not Log Sensitive Data

* **Rule:** Logs must not contain passwords, tokens, API keys, private keys, full JWTs, Authorization headers, or sensitive PII.

---

## 7. Safe Subprocess Usage

* **Rule:** Subprocess calls must not use `shell=True`.
* Always pass arguments as a list.
* User input must be validated before inclusion in subprocess calls.
* Do not construct command strings using string concatenation.

---

## 8. Escape Output in Web Contexts

* **Rule:** When rendering user-controlled content into HTML, JSON, or CLI output, apply appropriate escaping.
* Do not manually build HTML strings from user input.
* Do not disable template auto-escaping.

---

## 9. Avoid Hardcoded Secrets

* **Rule:** Do not hardcode passwords, tokens, API keys, secret keys, or private keys in source code.
* Use environment variables or a secure configuration service.

---

## 10. Restrict Dynamic Imports

* **Rule:** Avoid `__import__()` or `importlib` with dynamic or user-controlled values.
* Dynamic imports must use explicit allowlists.

---

## 11. Avoid Implicit Truthiness in Security Logic

* **Rule:** In authentication and authorization logic, do not rely on implicit truthiness (e.g., `if token:`).
* Use explicit checks (e.g., `if token is not None:`).
* Security logic must be explicit and type-safe.

---

## 12. Do Not Use `pickle` with Untrusted Data

* **Rule:** Do not load or deserialize untrusted data using `pickle`, `cPickle`, or `dill`.
* Use safe formats like `json` or schema-validated models.

---

## 13. Safe YAML Loading

* **Rule:** When using PyYAML, always use `yaml.safe_load()`.
* Do not use `yaml.load()` without `SafeLoader`.

---

## 14. Preserve Framework Security Defaults

* **Rule:** Do not disable CSRF protection, authentication middleware, template auto-escaping, or restrictive CORS policies without justification.
* Any such change must include a comment marked `# security-reviewed`.

---

## 15. Dependency Hygiene

* **Rule:** Project dependencies must be reproducible and version-constrained.
* If using requirements.txt, all dependencies must be fully pinned (e.g., package==1.2.3).
* If using pyproject.toml, a lock file or equivalent mechanism must be used to ensure reproducible installs.
* Do not use wildcard version specifiers (e.g., package==*).
* Security audits (e.g., pip-audit) must be run before release. 
* Avoid introducing unmaintained or abandoned packages.

---

## 16. Security-Sensitive Code Requires Justification

* **Rule:** Code that performs file system access, subprocess execution, authentication, authorization, cryptographic operations, or dynamic imports must include a short explanatory comment describing why it is safe.
* If an exception to any rule is required, it must include `# security-reviewed` and a justification comment.

---
