---
description: USE WHEN implementing code that interacts with SQL databases, regardless of language or framework, including generated code.
alwaysApply: false
---
# Secure SQL Usage

These rules apply to all code that interacts with SQL databases, regardless of language or framework, including generated code.

All violations must include a clear explanation of which rule was triggered and why, to help developers understand and fix the issue effectively.  
Generated code must not violate these rules. If a rule is violated, a comment must be added explaining the issue and suggesting a correction.

## 1. Always Use Parameterized Queries and Prepared Statements
- **Rule:** Never construct SQL queries by concatenating or interpolating user input directly into the query string. Always use parameterized queries or prepared statements provided by your database library. Prepared statements ensure that user input is treated as data, not executable code, and are the most effective way to prevent SQL injection.
- **Example (unsafe, Python):**
  ```python
  cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")
  ```
- **Example (safe, Python):**
  ```python
  cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
  ```
- **Example (unsafe, PHP):**
  ```php
  $query = "SELECT * FROM users WHERE username = '" . $_GET['username'] . "'";
  $result = mysqli_query($conn, $query);
  ```
- **Example (safe, PHP - using prepared statements):**
  ```php
  $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
  $stmt->bind_param("s", $_GET['username']);
  $stmt->execute();
  $result = $stmt->get_result();
  ```

## 2. Validate Inputs Before Query Use
- **Rule:** All external input used in query logic must be validated for type, length, format, and business constraints before use. Validation is defense in depth; it does not replace parameterized queries or prepared statements.
- **Rule:** Do not SQL-escape, quote, or otherwise encode input at collection or storage time. Keep values as data and pass them through parameterized query APIs at the point of database use.

## 3. Avoid Dynamic SQL Unless Absolutely Necessary
- **Rule:** Do not build dynamic SQL structure (e.g., table names, column names, schema names, sort directions, operators) from user-controlled strings unless there is no safe alternative.
- **Rule:** If dynamic SQL structure is unavoidable, user input may only select a key from a closed mapping or enum whose values are developer-defined SQL fragments. The user-provided string must never be inserted into the SQL text, even after validation or allow-list checks.
- **Example (unsafe, Python - validated user string still enters SQL):**
  ```python
  ALLOWED_COLUMNS = {"created_at", "email", "username"}
  if sort_column not in ALLOWED_COLUMNS:
      raise ValueError("invalid sort column")
  cursor.execute(f"SELECT * FROM users ORDER BY {sort_column}")
  ```
- **Example (safe, Python - user input selects a developer-defined literal):**
  ```python
  SORT_COLUMNS = {
      "created": "created_at",
      "email": "email",
      "name": "username",
  }
  sort_sql_fragment = SORT_COLUMNS.get(requested_sort)
  if sort_sql_fragment is None:
      raise ValueError("invalid sort option")
  # Safe: sort_sql_fragment is a developer-defined literal, not user input.
  cursor.execute(f"SELECT * FROM users ORDER BY {sort_sql_fragment}")
  ```

## 4. Use Least Privilege Database Accounts
- **Rule:** Connect to the database using accounts with the minimum privileges required for the task. Never use admin or superuser accounts for application queries.

## 5. Do Not Expose Database Errors to Users
- **Rule:** Never return raw database error messages to end users. Log errors securely and show generic error messages instead.

## 6. Avoid Storing Sensitive Data in Plaintext
- **Rule:** Do not store passwords, tokens, or sensitive data in plaintext. Use strong, salted hashing for passwords and encryption for sensitive fields.

## 7. Close Database Connections Properly

- **Rule:** Always close database connections and cursors to avoid resource leaks and potential security issues.