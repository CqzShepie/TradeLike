namespace TradeLike.Api.Models;

public class ApiUsageStat
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public DateTime PeriodStartUtc { get; set; }

    public int Requests { get; set; }

    public int ExportCalls { get; set; }

    public int AutomationRuns { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
