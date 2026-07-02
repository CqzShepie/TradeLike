# TradeLike Staff Domain

TradeLike uses one frontend build across the public, customer, and internal
staff experiences:

- `tradelike.co.uk` is the public marketing site.
- `app.tradelike.co.uk` is the customer workspace.
- `staff.tradelike.co.uk` is the internal TradeLike Studio portal.

## Hostname Behaviour

The client detects hostnames in `client/src/config/hostnames.ts`.

- Unauthenticated users on `staff.tradelike.co.uk` are sent to `/staff-login`.
- Authenticated internal staff on `staff.tradelike.co.uk` default to `/admin`.
- Authenticated customer users on `staff.tradelike.co.uk` see a staff access
  denied screen with a customer login link.
- Unauthenticated users on `app.tradelike.co.uk` are sent to `/login`.
- Customer users on `app.tradelike.co.uk` default to `/dashboard`.
- Internal staff may still manually open `/admin` on localhost and the app
  hostname when their role is a Studio role.

Local development keeps both `/login` and `/staff-login` available on localhost.

## API Login

Studio sign-in posts to `POST /api/auth/staff-login`. The endpoint uses the
same password verification and rate-limit policy as customer login, but only
allows internal TradeLike roles. It rejects customer roles with HTTP 403.

The auth response shape is the same as `/api/auth/login`, with the plan set to
`Internal` for accepted staff users.

## Deployment Notes

The API CORS `AllowedOrigins` configuration must include:

- `https://staff.tradelike.co.uk`
- `https://app.tradelike.co.uk`
- `https://tradelike.co.uk`

No separate frontend artifact is required for the staff domain. Point
`staff.tradelike.co.uk` at the same built client app and configure the hosting
fallback to serve the SPA entrypoint.
