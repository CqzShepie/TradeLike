using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class Dashboard
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    public string LayoutJson { get; set; } = "[]";

    public int CreatedById { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<DashboardWidget> Widgets { get; set; } = new();
}

public class DashboardWidget
{
    public int Id { get; set; }

    public int DashboardId { get; set; }

    public Dashboard? Dashboard { get; set; }

    public DashboardWidgetType Type { get; set; }

    public string QueryJson { get; set; } = "{}";

    public string PositionJson { get; set; } = "{}";
}

public enum DashboardWidgetType
{
    Line,
    Bar,
    KPI,
    Table
}
