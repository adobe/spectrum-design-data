---
description: USE WHEN designing, implementing, or reviewing API security (versioning, auth, rate limits, testing)
alwaysApply: false
---
# API Security

These rules apply to Secure API design and implementation and it is critical for protecting data and services.

### Secure API design
- Version endpoints using semantic versioning (`/v1/`, `/v2/`,`/v3/`,`/v4/`)
- Grant only the minimum permissions needed for each endpoint
- Document required authentication method and specific permission scopes in OpenAPI/Swagger
- Re-use security patterns across endpoints for consistency
- Return consistent HTTP status codes and error messages following RFC 7807


### Auth & access
- Require OAuth 2.0 / JWT for user authentication
- Validate tokens on every request with proper signature verification
- Enforce Role-Based Access Control (RBAC) or Attribute-Based Access Control (ABAC)
- Issue API keys with specific scopes for service-to-service calls
- Implement token refresh with secure rotation

### Request protection
- Apply rate‑limit & throttle
- Validate request schema using JSON Schema or similar validation
- Configure CORS to allow only specific origins, methods, and headers
- Check content-type headers and validate request structure
- Block parameter pollution attacks by validating parameter names

## Security Headers
- Set `X-Content-Type-Options: nosniff`
- Set `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN`
- Set `X-XSS-Protection: 1; mode=block`
- Implement Content Security Policy (CSP) headers
- Use `Strict-Transport-Security` for HTTPS enforcement


### Test & monitor
- Run API‑focused security tests
- Log security findings and fix critical issues 
- Track & fix findings

## Anti-Patterns to Avoid
- Leaking sensitive data in API responses (PII, tokens, internal errors)
- Allowing insecure direct object references without access checks
- Serving APIs over HTTP (always use HTTPS)
- Skipping input validation on any endpoint
- Revealing stack traces or internal system details in error responses
- Using weak authentication methods (Basic Auth, API keys without scopes)
