namespace TradeLike.Api.Configuration;

public static class PlanPricing
{
    public const long GigabyteBytes = 1_000_000_000;

    public const int SoloMonthlyPricePence = 3295;
    public const int TeamMonthlyPricePence = 11995;
    public const int BusinessMonthlyPricePence = 22995;

    public const long SoloIncludedStorageBytes = 10 * GigabyteBytes;
    public const long TeamIncludedStorageBytes = 50 * GigabyteBytes;
    public const long BusinessIncludedStorageBytes = 250 * GigabyteBytes;

    public const int SoloExpectedMixPercent = 72;
    public const int TeamExpectedMixPercent = 20;
    public const int BusinessExpectedMixPercent = 7;
    public const int EnterpriseExpectedMixPercent = 1;

    public const int SelfServeMonthlyPlanPriceSumPence =
        SoloMonthlyPricePence + TeamMonthlyPricePence + BusinessMonthlyPricePence;
}
