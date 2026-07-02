namespace TradeLike.Api.Configuration;

public static class PlanPricing
{
    public const int SoloMonthlyPricePence = 4495;
    public const int TeamMonthlyPricePence = 11995;
    public const int BusinessMonthlyPricePence = 22995;

    public const int SoloExpectedMixPercent = 72;
    public const int TeamExpectedMixPercent = 20;
    public const int BusinessExpectedMixPercent = 7;
    public const int EnterpriseExpectedMixPercent = 1;

    public const int SelfServeMonthlyPlanPriceSumPence =
        SoloMonthlyPricePence + TeamMonthlyPricePence + BusinessMonthlyPricePence;
}
