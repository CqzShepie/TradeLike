namespace TradeLike.Api.Configuration;

public static class PlanPricing
{
    public const int SoloMonthlyPricePence = 3995;
    public const int TeamMonthlyPricePence = 9995;
    public const int BusinessMonthlyPricePence = 15995;

    public const int SoloExpectedMixPercent = 72;
    public const int TeamExpectedMixPercent = 20;
    public const int BusinessExpectedMixPercent = 7;
    public const int EnterpriseExpectedMixPercent = 1;

    public const int SelfServeMonthlyPlanPriceSumPence =
        SoloMonthlyPricePence + TeamMonthlyPricePence + BusinessMonthlyPricePence;
}
