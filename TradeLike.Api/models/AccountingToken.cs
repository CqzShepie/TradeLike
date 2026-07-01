using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public enum AccountingProvider
{
    Xero,
    QuickBooks
}

public class AccountingToken
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public AccountingProvider Provider { get; set; }

    [Required]
    public string AccessToken { get; set; } = string.Empty;

    [Required]
    public string RefreshToken { get; set; } = string.Empty;

    public DateTime ExpiresUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
