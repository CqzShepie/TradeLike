namespace TradeLike.Api.Contracts.Settings;

public sealed record CustomerSettingsResponse(
    AccountSettingsResponse Account,
    BusinessSettingsResponse BusinessProfile,
    SecuritySettingsResponse Security,
    PlanBillingSettingsResponse PlanBilling,
    JobDefaultsSettingsResponse JobDefaults,
    DocumentDefaultsSettingsResponse DocumentDefaults,
    ReportDefaultsSettingsResponse ReportDefaults,
    InventoryDefaultsSettingsResponse InventoryDefaults,
    NotificationSettingsResponse Notifications,
    IReadOnlyList<CustomerSettingsTeamMemberResponse> TeamMembers);

public sealed record AccountSettingsResponse(
    int UserId,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string Role,
    string BusinessName,
    string? OwnerName,
    string? OwnerPhone,
    string AccountStatus,
    string PlanName,
    string BillingStatus,
    bool CanEdit);

public sealed record SecuritySettingsResponse(
    bool IsEmailVerified,
    DateTime? EmailVerificationSentAt,
    bool PasswordResetRequired,
    DateTime? LastLoginAtUtc,
    DateTime? SessionExpiresAtUtc);

public sealed record PlanBillingSettingsResponse(
    string PlanName,
    string BillingStatus,
    int? MonthlyPricePence,
    int? MaxIncludedUsers,
    int SeatsPurchased,
    DateTime? BillingStartUtc,
    DateTime? NextInvoiceDateUtc,
    DateTime? TrialEndsAtUtc,
    string AccountStatus);

public sealed record JobDefaultsSettingsResponse(
    string DefaultJobPriority,
    string DefaultScheduleView,
    bool CanEdit);

public sealed record DocumentDefaultsSettingsResponse(
    decimal DefaultVatRate,
    string QuotePrefix,
    string InvoicePrefix,
    int QuoteExpiryDays,
    string? PaymentTerms,
    string? DefaultQuoteNotes,
    string? DefaultInvoiceNotes,
    string? ReplyToEmail,
    string? EmailFooter,
    bool CanEdit);

public sealed record ReportDefaultsSettingsResponse(
    string DefaultReportRange,
    bool IncludeCompletedInReports,
    bool IncludeArchivedInReports,
    bool CanEdit);

public sealed record InventoryDefaultsSettingsResponse(
    int LowStockThreshold,
    string PurchaseOrderPrefix,
    bool CanEdit);

public sealed record NotificationSettingsResponse(
    string AutomatedSenderEmail,
    string SupportInboxEmail,
    string SalesInboxEmail,
    string GeneralInboxEmail,
    string? BusinessReplyToEmail,
    string EmailStatus);

public sealed record CustomerSettingsTeamMemberResponse(
    int Id,
    string Name,
    string Email,
    string Role,
    string Status,
    bool IsCurrentUser,
    bool CanEditRole,
    bool CanEditStatus);

public sealed record UpdateAccountSettingsRequest(
    string FirstName,
    string LastName,
    string? BusinessName,
    string? OwnerName,
    string? OwnerPhone);

public sealed record UpdateBusinessProfileSettingsRequest(
    string BusinessName,
    string? LegalName,
    string? OwnerName,
    string? OwnerPhone,
    string? Phone,
    string? Email,
    string? AddressLine1,
    string? AddressLine2,
    string? Town,
    string? County,
    string? Postcode,
    string? Country,
    string? Website,
    string? VatNumber,
    string? CompanyNumber);

public sealed record UpdateJobDefaultsSettingsRequest(
    string DefaultJobPriority,
    string DefaultScheduleView);

public sealed record UpdateDocumentDefaultsSettingsRequest(
    decimal DefaultVatRate,
    string QuotePrefix,
    string InvoicePrefix,
    int QuoteExpiryDays,
    string? PaymentTerms,
    string? DefaultQuoteNotes,
    string? DefaultInvoiceNotes,
    string? ReplyToEmail,
    string? EmailFooter);

public sealed record UpdateReportDefaultsSettingsRequest(
    string DefaultReportRange,
    bool IncludeCompletedInReports,
    bool IncludeArchivedInReports);

public sealed record UpdateInventoryDefaultsSettingsRequest(
    int LowStockThreshold,
    string PurchaseOrderPrefix);

public sealed record UpdateCustomerSettingsTeamMemberRequest(
    string Role,
    string Status);
