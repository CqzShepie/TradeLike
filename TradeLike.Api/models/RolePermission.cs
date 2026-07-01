using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public enum FieldPermission
{
    Read = 0,
    Write = 1,
    Hidden = 2
}

public class RolePermission
{
    [Required]
    [MaxLength(80)]
    public string RoleName { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Entity { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string Field { get; set; } = string.Empty;

    public FieldPermission Permission { get; set; } = FieldPermission.Write;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
