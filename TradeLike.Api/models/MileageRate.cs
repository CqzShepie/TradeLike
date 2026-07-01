namespace TradeLike.Api.Models;

public class MileageRate
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int PencePerMile { get; set; }

    public DateTime EffectiveFromUtc { get; set; }
}
