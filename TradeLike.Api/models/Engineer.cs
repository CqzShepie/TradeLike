using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class Engineer
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Phone { get; set; }

    public string? Email { get; set; }
}
