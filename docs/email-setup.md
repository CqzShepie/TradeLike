# TradeLike email setup

TradeLike has four official email addresses:

- `sales@tradelike.co.uk`
- `support@tradelike.co.uk`
- `hello@tradelike.co.uk`
- `noreply@tradelike.co.uk`

## Inbox rules

- `sales`, `support`, and `hello` are monitored inboxes.
- `noreply` is for automated system sending only.
- Do not use `noreply` as a customer contact inbox.

## Sender and reply-to rules

- Automated emails should use `From: TradeLike <noreply@tradelike.co.uk>`.
- Automated emails should use `Reply-To: support@tradelike.co.uk` unless the business context needs a monitored tenant address.
- Quote and invoice emails should reply to the tenant business email when one is configured. If not, they should fall back to `support@tradelike.co.uk`.
- Sales, support, and general contact messages should route into the monitored TradeLike inboxes and set `Reply-To` to the submitter email.

## Configuration keys

- `Features:Email:Enabled`
- `Email:Provider`
- `Email:FromName`
- `Email:DefaultFromAddress`
- `Email:DefaultReplyToAddress`
- `TradeLike:Emails:Sales`
- `TradeLike:Emails:Support`
- `TradeLike:Emails:Hello`
- `TradeLike:Emails:NoReply`
- `Email:SendGrid:ApiKey`
- `Email:Postmark:ServerToken`
- `Email:Resend:ApiKey`
- `Email:AzureCommunicationServices:ConnectionString`
- `Email:AzureCommunicationServices:SenderAddress`

## Provider setup

Supported provider placeholders in this foundation:

- `SendGrid`
- `Postmark`
- `Resend`
- `AzureCommunicationServices`
- `Disabled`

This branch adds the shared config, message model, template builder, sender abstraction, and health check. Final delivery wiring for each provider is intentionally left for a follow-up integration pass.

## DNS and deliverability

Before enabling real sending in production:

- configure SPF for the sending provider
- configure DKIM for the sending provider
- publish a DMARC policy for `tradelike.co.uk`
- verify the sender domain or sender address with the chosen provider

## Production environment notes

- enable `Features:Email:Enabled`
- set `Email:Provider` to the chosen provider
- set the provider secret keys in environment variables or secure configuration
- keep `Email:DefaultFromAddress` as `noreply@tradelike.co.uk`
- keep `Email:DefaultReplyToAddress` pointed at a monitored inbox

## Development behaviour

- development defaults to `Features:Email:Enabled = false`
- `Email:Provider = Disabled`
- no real emails should be sent from local development unless explicitly enabled

## Frontend safety

- never expose provider keys or connection strings to the frontend
- frontend code should use shared contact constants rather than scattering hard-coded inbox addresses
