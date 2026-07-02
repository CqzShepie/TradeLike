# Auth role migration

TradeLike now uses explicit customer roles and no longer guesses that legacy roles are company owners at runtime.

## Valid roles

Customer app roles:

- `CustomerDirector`
- `CustomerManager`
- `CustomerEmployee`

Studio/internal roles:

- `Director`
- `Admin`
- `Support`
- `Junior Developer`
- `Developer`
- `Senior Developer`
- `Marketing`
- `Customer Service`
- `Operations Coordinator`
- `Personal Assistant`

Legacy `Customer` is not accepted by customer-app policies until it has been migrated. Internal `Director` is a Studio role and must not be converted to `CustomerDirector`.

## Why runtime mapping was removed

The old frontend/backend normalisation could map `Customer` or `Director` to `CustomerDirector`. That can over-permission an account because the app is guessing ownership during login or route checks. The safer approach is to migrate records explicitly and block ambiguous roles until they are reviewed.

## Inspect local users

Use this in local development to see roles that need attention:

```sql
SELECT Id, TenantId, Email, Role, SubscriptionPlan, AccountStatus
FROM Users
ORDER BY TenantId, Id;
```

## Safe local owner migration

Only run this for a known owner account where `TenantId = Id` proves the user is the tenant root:

```sql
UPDATE Users
SET Role = 'CustomerDirector'
WHERE Email = 'your-email' AND TenantId = Id;
```

For a reviewed non-owner member of an existing tenant, use:

```sql
UPDATE Users
SET Role = 'CustomerEmployee'
WHERE Email = 'member-email' AND TenantId <> Id;
```

Do not broadly migrate every `Customer` user to `CustomerDirector`.

## Clear stale browser session

After changing a local user's role, sign out and clear the browser's TradeLike local storage entries:

- `tradelike_token`
- `tradelike_user`

Then sign in again so the app receives a token with the canonical role.
