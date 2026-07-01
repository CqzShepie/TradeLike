using System.Text.Json.Serialization;

namespace TradeLike.Api.Models;

public class VanStock
{
    public int Id { get; set; }

    [JsonIgnore]
    public int TenantId { get; set; }

    public int VanId { get; set; }

    public Van? Van { get; set; }

    public int ProductId { get; set; }

    public Product? Product { get; set; }

    public int Qty { get; set; }
}
