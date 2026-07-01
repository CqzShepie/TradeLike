using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public enum GeneratedDocumentEntityType
{
    Quote,
    Invoice,
    Job,
    Certificate
}

public class GeneratedDocument
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public GeneratedDocumentEntityType EntityType { get; set; }

    public int EntityId { get; set; }

    [Required]
    [MaxLength(1000)]
    public string PdfUrl { get; set; } = string.Empty;

    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;

    public int GeneratedById { get; set; }
}
