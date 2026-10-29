---
description: USE WHEN implementing user authentication, login systems, session management, or access control
alwaysApply: false
---
# Authentication & Authorization

Secure authentication and authorization are essential for protecting user data and system resources.

## Authentication Best Practices

### Password Management

- Implement strong password requirements (minimum 12 characters, must include uppercase, lowercase, numbers, and special characters)
- Store passwords using strong, slow hashing algorithms (bcrypt with 12+ rounds, Argon2)
- Never store plaintext passwords in any form
- Implement account lockout after 5 failed attempts with 30-minute lockout period

### Multi-Factor Authentication

- Implement MFA for all user accounts, especially admin users and users with financial access
- Support multiple second-factor options (TOTP, SMS, email, hardware tokens)
- Apply MFA to critical operations (password resets, financial transactions, admin actions, data exports)
- Verify MFA on the server side, never trust client-side validation

### Session Management

- Generate strong, random session identifiers (32+ characters using cryptographically secure random)
- Implement secure cookie attributes (Secure, HttpOnly, SameSite=Strict)
- Apply appropriate session timeouts (15 minutes for sensitive operations, 2 hours for regular sessions)
- Invalidate sessions on logout and password change
- Regenerate session IDs after authentication
- Implement mechanisms to revoke sessions remotely

## Authorization Best Practices

### Access Control Models

- Implement Role-Based Access Control (RBAC) with resource-level permissions (read, write, delete)
- Apply the principle of least privilege for all users
- Use attribute-based access control for fine-grained permissions
- Centralize authorization logic in dedicated services

### Implementation Patterns

- Verify authorization on every request, including API calls
- Implement authorization checks at multiple layers (frontend UI, API middleware, database row-level security)
- Apply consistent authorization across all interfaces (API, UI, CLI)
- Never rely on client-side authorization alone

## Anti-Patterns to Avoid

- Implementing custom authentication schemes without security review
- Relying on security through obscurity
- Hardcoding credentials in source code
- Using direct object references without access checks
- Implementing client-side authorization only
- Storing session tokens in localStorage
- Using weak password requirements (under 12 characters, no complexity requirements, or common passwords)