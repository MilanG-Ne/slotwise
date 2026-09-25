# Security

Slotwise is a local portfolio demo with public fictional credentials. **Do not expose the demo configuration to the internet.** The app port binds to loopback; the database is reachable only inside the Compose network.

## Controls included

- Session authentication, login throttling, CSRF protection, and session regeneration.
- Server-side role checks, owner-derived booking writes, validated resource fields, and member title privacy.
- PostgreSQL overlap exclusion, resource row locks, and transactional cancellation.
- React text escaping, a same-origin CSP, framing protection, and `nosniff` headers. Inline style attributes are allowed for schedule positioning; inline scripts are not.
- A 16 KiB Apache request limit in the Docker demo.
- No uploads, external URL fetching, email delivery, analytics, payment integration, or application API keys.
- Runtime files, environment settings, session data, and generated keys are excluded from Git and the Docker build context. Docker creates a random application key and persists it in its storage volume.

## Before public hosting

Disable `DEMO_MODE`, remove every seeded account, and establish a secure user-provisioning and password-recovery process. Merely hiding the demo buttons does **not** remove existing accounts. Use unique database credentials, a least-privilege application role, a separately privileged migration process where needed, HTTPS with secure cookies, and correctly scoped trusted proxies. Keep the document root at `backend/public`.

Configure backups, log retention, dependency updates, infrastructure throttling, and capacity monitoring. Application limits do not provide DDoS protection. The sample Docker database role owns its database for easy local extension setup; it is not a production privilege model. A running Docker demo consumes local CPU, memory, disk, and download bandwidth; no hosted service is provisioned by this project.

Use a dedicated test database: backend migration tests replace its schema. Browser tests create fictional reservations and resources in their target demo.

## Reporting

For vulnerabilities, use GitHub's private vulnerability reporting when available, or the private contact route on the maintainer's GitHub profile. Do not include credentials or private customer data in a public issue.
