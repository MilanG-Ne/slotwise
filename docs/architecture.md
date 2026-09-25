# Design notes

## One origin, one workspace

Laravel serves the compiled React app and session-authenticated JSON endpoints. Cookies are HTTP-only, same-site, and encrypted at rest in the database session store. Mutations use Laravel's CSRF middleware and a token obtained from `/api/session`. Successful sign-in regenerates the session ID; sign-out invalidates it and rotates the CSRF token. No bearer tokens or passwords are stored in browser storage.

The app has two roles and one shared workspace. Resource writes require an admin. A booking's owner is always taken from the authenticated session, never the request body. The serializer hides another member's title and owner; admins see those details. There is no registration endpoint or mass-assignment route for users.

## Reservation consistency

The database exclusion constraint is the final authority on overlapping active reservations. A prior GET is only a snapshot. A reservation attempt never trusts the calendar to remain current.

The reservation transaction first locks its resource row. An admin resource update takes the same lock. Thus deactivation and reservation have a definite order: a reservation committed before deactivation remains valid; requests after deactivation are refused. This serializes writes per resource, an acceptable tradeoff for a small workspace. The constraint also protects writers that bypass this service.

Cancellation locks the booking row, permits only future bookings, and is idempotent. Cancelled rows remain as history. Resources are paused rather than deleted, preserving existing bookings and foreign-key references. Admins are told explicitly that pausing does not cancel reservations.

The constraint uses `tstzrange` and half-open bounds. A check constraint also rejects inverted or longer-than-four-hour intervals. API validation adds half-hour steps, future times, a 90-day horizon, and workspace opening hours.

## Time

Inputs contain a local calendar date, a wall-clock time, and a duration. The server interprets these in `WORKSPACE_TIMEZONE` (Europe/Belgrade by default) and stores UTC instants. JSON includes offsets. The frontend formats using the server-provided workspace zone, never the viewer's device zone. Tests cover the daylight-saving change. Opening hours exclude the ambiguous overnight transition period in the default zone; arbitrary zones with daytime clock changes are outside the tested configuration.

## Client state

TanStack Query owns remote state. Query functions consume abort signals so a stale fetch cannot overwrite optimistic cancellation. Cancellation snapshots all booking queries, marks the reservation cancelled, restores snapshots on failure, and invalidates queries when settled. Reservation creation stays pending until the server confirms it: we do not optimistically claim ownership of a slot.

The schedule refreshes every 30 seconds while visible and on window focus. A conflict refreshes the schedule without discarding the form. Hash-based navigation preserves the four small views without an extra routing layer. Modal inputs stay local to their forms; native `dialog` supplies focus containment and Escape behavior, with explicit initial focus and restoration.

## Deliberate limits

No queue or Redis is needed. Session and throttle state use PostgreSQL. There are no outbound application HTTP calls, paid integrations, or user uploads. Login, general API access, and booking creation have separate rate limits.

This is not a public SaaS product. Public deployment needs account provisioning, operational monitoring, backups, HTTPS/proxy configuration, and a decision about abuse limits and history retention. The repository's Compose file is intentionally a local demo.
