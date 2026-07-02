namespace TradeLike.Api.Contracts.Storage;

public sealed record StorageUsageResponse(
    long IncludedStorageBytes,
    long PurchasedStorageBytes,
    long? ManualStorageOverrideBytes,
    long EffectiveLimitBytes,
    long UsedStorageBytes,
    long AvailableBytes,
    decimal UsedPercent,
    string WarningLevel,
    bool CanUpload,
    IReadOnlyList<StorageAddOnPlanResponse> AddOnPlans,
    IReadOnlyList<TenantStorageAddOnResponse> ActiveAddOns);

public sealed record StorageAddOnPlanResponse(
    string Code,
    string Label,
    long ExtraStorageBytes,
    int MonthlyPricePence,
    bool IsActive);

public sealed record TenantStorageAddOnResponse(
    int Id,
    string Code,
    string Label,
    long ExtraStorageBytes,
    int MonthlyPricePence,
    string Status,
    DateTime? CurrentPeriodEndUtc,
    bool CancelAtPeriodEnd);

public sealed record StoragePreflightRequest(
    string FileName,
    string ContentType,
    long SizeBytes,
    string Category,
    string? LinkedEntityType,
    int? LinkedEntityId,
    bool IsGenerated,
    int? ParentStorageObjectId);

public sealed record StoragePreflightResponse(
    bool CanUpload,
    string Message,
    long EffectiveLimitBytes,
    long UsedStorageBytes,
    long AvailableBytes,
    string? BlobKey);

public sealed record StorageFinalizeRequest(
    string BlobKey,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Category,
    string? LinkedEntityType,
    int? LinkedEntityId,
    bool IsGenerated,
    int? ParentStorageObjectId);

public sealed record StorageObjectResponse(
    int Id,
    string BlobKey,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Category,
    string? LinkedEntityType,
    int? LinkedEntityId,
    bool IsGenerated,
    string Status,
    DateTime CreatedAtUtc);

public sealed record StorageCheckoutRequest(string Code, bool Confirmed);

public sealed record StorageCheckoutResponse(
    string Message,
    string Code,
    string Label,
    long ExtraStorageBytes,
    int MonthlyPricePence,
    string? CheckoutUrl,
    bool RequiresPaymentConfirmation);

public sealed record StorageCancelAddOnRequest(bool Confirmed);

public sealed record AdminStorageOverrideRequest(long? ManualStorageOverrideBytes, string Reason);

public sealed record AdminStorageTenantResponse(
    int TenantId,
    string? BusinessName,
    string? Email,
    StorageUsageResponse Usage);
