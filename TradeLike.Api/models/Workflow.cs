using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class Workflow
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    [Required]
    [MaxLength(180)]
    public string Name { get; set; } = string.Empty;

    public int EngineVersion { get; set; } = 3;

    public string DefinitionJson { get; set; } = "{}";

    public string? DiagramJson { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
