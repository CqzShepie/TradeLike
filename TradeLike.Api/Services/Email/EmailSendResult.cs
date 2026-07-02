namespace TradeLike.Api.Services.Email;

public sealed record EmailSendResult(
    EmailSendStatus Status,
    string Provider,
    string Message);
