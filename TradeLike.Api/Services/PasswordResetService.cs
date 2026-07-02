using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public sealed class PasswordResetService
{
    public const int TokenExpiryMinutes = 60;

    public const string GenericForgotPasswordMessage =
        "If an account exists for that email, we'll send a password reset link.";

    private readonly TradeLikeDbContext _context;
    private readonly NotificationQueue _notificationQueue;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<PasswordResetService> _logger;

    public PasswordResetService(
        TradeLikeDbContext context,
        NotificationQueue notificationQueue,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<PasswordResetService> logger)
    {
        _context = context;
        _notificationQueue = notificationQueue;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<PasswordResetIssueResult?> RequestSelfServiceResetAsync(
        string? email,
        HttpContext httpContext,
        CancellationToken cancellationToken = default)
    {
        var cleanedEmail = email?.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(cleanedEmail) || !cleanedEmail.Contains('@'))
        {
            return null;
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(existingUser => existingUser.Email == cleanedEmail, cancellationToken);

        if (user is null || user.AccountStatus is "Suspended" or "Cancelled" or "InvitePending")
        {
            return null;
        }

        var result = await IssueResetAsync(user, cancellationToken);

        await _context.AdminAuditLogs.AddAsync(new AdminAuditLog
        {
            TenantId = user.TenantId == 0 ? user.Id : user.TenantId,
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            ActorName = $"{user.FirstName} {user.LastName}".Trim(),
            ActorRole = user.Role,
            Action = "PasswordResetLinkRequested",
            TargetType = "User",
            TargetId = user.Id,
            TargetEmail = user.Email,
            Summary = $"Password reset link requested for {user.Email}.",
            Details = "Self-service password reset request. Token was not logged.",
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            CreatedAt = DateTime.UtcNow
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return result;
    }

    public async Task<PasswordResetIssueResult> IssueResetAsync(
        User user,
        CancellationToken cancellationToken = default)
    {
        var token = CreateToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(TokenExpiryMinutes);
        var resetLink = BuildResetLink(token);

        user.PasswordResetTokenHash = HashToken(token);
        user.PasswordResetTokenExpiresAtUtc = expiresAt;
        user.PasswordResetRequestedAtUtc = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await SendResetEmailAsync(user, resetLink, expiresAt, cancellationToken);

        return new PasswordResetIssueResult(
            _environment.IsDevelopment() ? resetLink : null,
            expiresAt);
    }

    public async Task<PasswordResetResult> ResetPasswordAsync(
        string? token,
        string? newPassword,
        HttpContext httpContext,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return PasswordResetResult.InvalidOrExpiredToken;
        }

        if (string.IsNullOrEmpty(newPassword) || newPassword.Length < 8)
        {
            return PasswordResetResult.InvalidPassword;
        }

        var tokenHash = HashToken(token.Trim());
        var now = DateTime.UtcNow;
        var user = await _context.Users
            .FirstOrDefaultAsync(existingUser => existingUser.PasswordResetTokenHash == tokenHash, cancellationToken);

        if (user is null ||
            user.PasswordResetTokenExpiresAtUtc is null ||
            user.PasswordResetTokenExpiresAtUtc <= now)
        {
            if (user is not null)
            {
                ClearResetFields(user);
                await _context.SaveChangesAsync(cancellationToken);
            }

            return PasswordResetResult.InvalidOrExpiredToken;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetRequired = false;
        ClearResetFields(user);
        user.UpdatedAt = now;

        await _context.AdminAuditLogs.AddAsync(new AdminAuditLog
        {
            TenantId = user.TenantId == 0 ? user.Id : user.TenantId,
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            ActorName = $"{user.FirstName} {user.LastName}".Trim(),
            ActorRole = user.Role,
            Action = "PasswordResetCompleted",
            TargetType = "User",
            TargetId = user.Id,
            TargetEmail = user.Email,
            Summary = $"Password reset completed for {user.Email}.",
            Details = "Self-service password reset completed. Password value was not logged.",
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            CreatedAt = now
        }, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return PasswordResetResult.Success;
    }

    public static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private async Task SendResetEmailAsync(
        User user,
        string resetLink,
        DateTime expiresAt,
        CancellationToken cancellationToken)
    {
        var notificationsEnabled = _configuration.GetValue("Features:Notifications:Enabled", false);
        var hasQueueConfig =
            !string.IsNullOrWhiteSpace(_configuration["SERVICEBUS_CONNECTION_STRING"]) ||
            !string.IsNullOrWhiteSpace(_configuration["AZURE_SERVICEBUS_CONNECTION_STRING"]) ||
            !string.IsNullOrWhiteSpace(_configuration["AzureServiceBus:ConnectionString"]);

        if (!notificationsEnabled || !hasQueueConfig)
        {
            if (_environment.IsDevelopment())
            {
                _logger.LogInformation(
                    "Password reset link for {Email}: {ResetLink}",
                    user.Email,
                    resetLink);
            }
            else
            {
                _logger.LogWarning(
                    "Password reset email for {Email} was not sent because notifications are disabled or missing config.",
                    user.Email);
            }

            return;
        }

        try
        {
            await _notificationQueue.EnqueueEmailAsync(new EmailNotification
            {
                TenantId = user.TenantId == 0 ? user.Id : user.TenantId,
                To = user.Email,
                Subject = "Reset your TradeLike password",
                Body = string.Join(
                    "\n\n",
                    "We received a request to reset your TradeLike password.",
                    $"Use this secure link before {expiresAt:u}: {resetLink}",
                    "If you did not request this, you can ignore this email.",
                    "Need help? Contact support@tradelike.co.uk."),
                Variables = new Dictionary<string, string>
                {
                    ["resetLink"] = resetLink,
                    ["expiresAt"] = expiresAt.ToString("u"),
                    ["supportEmail"] = "support@tradelike.co.uk",
                    ["fromEmail"] = "noreply@tradelike.co.uk"
                }
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Password reset email could not be queued for {Email}.",
                user.Email);
        }
    }

    private string BuildResetLink(string token)
    {
        var baseUrl = _configuration["Frontend:BaseUrl"]?.TrimEnd('/');

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = "http://localhost:5173";
        }

        return $"{baseUrl}/reset-password?token={Uri.EscapeDataString(token)}";
    }

    private static string CreateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static void ClearResetFields(User user)
    {
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiresAtUtc = null;
        user.PasswordResetRequestedAtUtc = null;
    }
}

public sealed record PasswordResetIssueResult(string? DevelopmentResetLink, DateTime ExpiresAtUtc);

public enum PasswordResetResult
{
    Success,
    InvalidOrExpiredToken,
    InvalidPassword
}
