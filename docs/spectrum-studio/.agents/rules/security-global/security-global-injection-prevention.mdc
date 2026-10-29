---
description: USE WHEN handling user input, database queries, command execution, or output rendering
alwaysApply: false
---
# Injection Prevention

Injection vulnerabilities are among the most common and dangerous security issues in web applications.

## Types of Injection Attacks

### SQL Injection

- Use parameterized queries or prepared statements
- Apply ORM frameworks with proper escaping
- Implement input validation and sanitization
- Avoid dynamic SQL construction

### Command Injection

- Avoid passing user input to system commands
- Use safer alternatives to shell execution
- Validate and sanitize all command parameters
- Apply allowlists for permitted commands

### Cross-Site Scripting (XSS)

- Apply context-specific output encoding
- Implement Content Security Policy (CSP)
- Use modern frameworks with built-in XSS protection
- Sanitize HTML content

### XML/XPATH Injection

- Use safe XML parsers
- Disable external entity processing
- Validate and sanitize XML input
- Apply parameterized XPATH queries

## Framework-Specific Protections

- Use template engines that auto-escape content
- Apply framework-specific security features
- Keep frameworks and libraries updated
- Follow security best practices for your stack

## Anti-Patterns to Avoid

- Using `eval()` or similar functions
- Constructing dynamic queries with string concatenation
- Directly using user input in commands
- Trusting client-side sanitization only
- Bypassing built-in security features
