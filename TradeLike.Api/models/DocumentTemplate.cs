using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public enum DocumentTemplateType
{
    Quote,
    Invoice,
    JobSheet,
    Certificate
}

public class DocumentTemplate
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public DocumentTemplateType Type { get; set; }

    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string HtmlTemplate { get; set; } = string.Empty;

    public int CreatedById { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
