# TradeLike Webhooks

TradeLike can send HTTPS webhook deliveries when tenant data changes through imports or API workflows.

## Subscribe

`POST /api/webhooks/subscribe`

```json
{
  "targetUrl": "https://example.com/webhooks/tradelike",
  "events": ["customer.created", "job.created", "invoice.created", "import.completed"]
}
```

The response includes a `signingSecret`. Store it when it is returned.

## Delivery Format

Webhook requests are sent as `POST` with an `application/json` body.

```json
{
  "id": "e76f1be9-7e5f-4a46-a66d-c22eea930a8d",
  "eventName": "job.created",
  "createdAtUtc": "2026-07-01T16:00:00Z",
  "data": {
    "id": 42,
    "customer": "Apex Plumbing",
    "jobTitle": "Boiler service"
  }
}
```

Delivery headers:

```http
X-TradeLike-Event: job.created
X-TradeLike-Delivery: 123
Authorization: Webhook <hex-hmac-sha256>
```

The signature is `HMACSHA256(signingSecret, rawRequestBody)` encoded as lowercase hex.

## Events

Supported events:

- `customer.created`
- `job.created`
- `invoice.created`
- `import.completed`
- `webhook.test`

Use `POST /api/webhooks/{id}/test` to queue a test delivery for a subscription.

## Retries

Any non-2xx response is treated as a failed delivery. Failed deliveries are retried with exponential backoff up to one hour between attempts.

## OAuth

Public API clients use OAuth2 client credentials:

`POST /api/oauth/token`

```http
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=tl_...&client_secret=tl_secret_...
```

Use the returned bearer token with `/api/public/v1/*`. Gateway traffic is limited to 60 requests per minute per client.
