using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Settings;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireEmployeeRole")]
[Route("api/settings")]
public sealed class SettingsController : ControllerBase
{
    private const string AutomatedSenderEmail = "noreply@tradelike.co.uk";
    private const string SupportInboxEmail = "support@tradelike.co.uk";
    private const string SalesInboxEmail = "sales@tradelike.co.uk";
    private const string GeneralInboxEmail = "hello@tradelike.co.uk";

    private readonly TradeLikeDbContext _context;

    public SettingsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<CustomerSettingsResponse>> Get()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var settings = await GetOrCreateSettingsAsync(tenantId, currentUser);
        var subscription = await LoadSubscriptionAsync(tenantId);
        var teamMembers = CanViewTeamMembers(currentUser, subscription?.Plan?.Name)
            ? await LoadTeamMembersAsync(tenantId, currentUser.Id)
            : [];

        return Ok(BuildResponse(currentUser, settings, subscription, teamMembers));
    }

    [HttpPut("account")]
    public async Task<ActionResult<AccountSettingsResponse>> UpdateAccount([FromBody] UpdateAccountSettingsRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        try
        {
            currentUser.FirstName = Required(request.FirstName, "First name", 100);
            currentUser.LastName = Required(request.LastName, "Last name", 100);

            if (CanManageTenantSettings(currentUser.Role))
            {
                var businessName = Clean(request.BusinessName, 180);
                var ownerName = Clean(request.OwnerName, 180);
                var ownerPhone = Clean(request.OwnerPhone, 40);

                var tenantUsers = await _context.Users
                    .Where(user => user.TenantId == tenantId && CustomerRoles.EmployeeRoles.Contains(user.Role))
                    .ToListAsync();

                foreach (var user in tenantUsers)
                {
                    user.BusinessName = businessName;
                    user.OwnerName = ownerName;
                    user.OwnerPhone = ownerPhone;
                    user.UpdatedAt = DateTime.UtcNow;
                }
            }

            currentUser.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(BuildAccountResponse(currentUser));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("business-profile")]
    public async Task<ActionResult<BusinessSettingsResponse>> UpdateBusinessProfile([FromBody] UpdateBusinessProfileSettingsRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var forbidden = RequireManagerOrDirector(currentUser.Role);
        if (forbidden is not null)
        {
            return forbidden;
        }

        try
        {
            var settings = await GetOrCreateSettingsAsync(tenantId, currentUser);
            settings.BusinessName = Required(request.BusinessName, "Business name", 180);
            settings.LegalName = Clean(request.LegalName, 180);
            settings.Phone = Clean(request.Phone, 40);
            settings.Email = CleanEmail(request.Email);
            settings.AddressLine1 = Clean(request.AddressLine1, 220);
            settings.AddressLine2 = Clean(request.AddressLine2, 220);
            settings.Town = Clean(request.Town, 120);
            settings.County = Clean(request.County, 120);
            settings.Postcode = Clean(request.Postcode, 30);
            settings.Country = Clean(request.Country, 120) ?? "United Kingdom";
            settings.Website = Clean(request.Website, 255);
            settings.VatNumber = Clean(request.VatNumber, 60);
            settings.CompanyNumber = Clean(request.CompanyNumber, 60);
            settings.UpdatedAt = DateTime.UtcNow;
            ValidateBusinessSettings(settings);

            var ownerName = Clean(request.OwnerName, 180);
            var ownerPhone = Clean(request.OwnerPhone, 40);
            var tenantUsers = await _context.Users
                .Where(user => user.TenantId == tenantId && CustomerRoles.EmployeeRoles.Contains(user.Role))
                .ToListAsync();

            foreach (var user in tenantUsers)
            {
                user.BusinessName = settings.BusinessName;
                user.OwnerName = ownerName;
                user.OwnerPhone = ownerPhone;
                user.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(ToBusinessResponse(settings));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("job-defaults")]
    public async Task<ActionResult<JobDefaultsSettingsResponse>> UpdateJobDefaults([FromBody] UpdateJobDefaultsSettingsRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var forbidden = RequireManagerOrDirector(currentUser.Role);
        if (forbidden is not null)
        {
            return forbidden;
        }

        try
        {
            var settings = await GetOrCreateSettingsAsync(tenantId, currentUser);
            settings.DefaultJobPriority = NormalizePriority(request.DefaultJobPriority);
            settings.DefaultScheduleView = NormalizeScheduleView(request.DefaultScheduleView);
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new JobDefaultsSettingsResponse(
                settings.DefaultJobPriority,
                settings.DefaultScheduleView,
                true));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("document-defaults")]
    public async Task<ActionResult<DocumentDefaultsSettingsResponse>> UpdateDocumentDefaults([FromBody] UpdateDocumentDefaultsSettingsRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var forbidden = RequireManagerOrDirector(currentUser.Role);
        if (forbidden is not null)
        {
            return forbidden;
        }

        try
        {
            var settings = await GetOrCreateSettingsAsync(tenantId, currentUser);
            settings.DefaultVatRate = ClampVat(request.DefaultVatRate);
            settings.QuoteExpiryDays = ClampDays(request.QuoteExpiryDays, "Quote expiry days");
            settings.PaymentTerms = Clean(request.PaymentTerms, 1000);
            settings.DefaultQuoteNotes = Clean(request.DefaultQuoteNotes, 2000);
            settings.DefaultInvoiceNotes = Clean(request.DefaultInvoiceNotes, 2000);
            settings.ReplyToEmail = CleanEmail(request.ReplyToEmail);
            settings.EmailFooter = Clean(request.EmailFooter, 2000);
            settings.UpdatedAt = DateTime.UtcNow;
            ValidateBusinessSettings(settings);
            await _context.SaveChangesAsync();

            return Ok(BuildDocumentDefaultsResponse(settings, true));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [PlanGuard(Feature.Reports)]
    [HttpPut("report-defaults")]
    public async Task<ActionResult<ReportDefaultsSettingsResponse>> UpdateReportDefaults([FromBody] UpdateReportDefaultsSettingsRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var forbidden = RequireManagerOrDirector(currentUser.Role);
        if (forbidden is not null)
        {
            return forbidden;
        }

        try
        {
            var settings = await GetOrCreateSettingsAsync(tenantId, currentUser);
            settings.DefaultReportRange = NormalizeReportRange(request.DefaultReportRange);
            settings.IncludeCompletedInReports = request.IncludeCompletedInReports;
            settings.IncludeArchivedInReports = request.IncludeArchivedInReports;
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(BuildReportDefaultsResponse(settings, true));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [PlanGuard(Feature.Inventory)]
    [HttpPut("inventory-defaults")]
    public async Task<ActionResult<InventoryDefaultsSettingsResponse>> UpdateInventoryDefaults([FromBody] UpdateInventoryDefaultsSettingsRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var forbidden = RequireManagerOrDirector(currentUser.Role);
        if (forbidden is not null)
        {
            return forbidden;
        }

        try
        {
            var settings = await GetOrCreateSettingsAsync(tenantId, currentUser);
            settings.LowStockThreshold = ClampLowStockThreshold(request.LowStockThreshold);
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(BuildInventoryDefaultsResponse(settings, true));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("team")]
    public async Task<ActionResult<IReadOnlyList<CustomerSettingsTeamMemberResponse>>> GetTeam()
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var subscription = await LoadSubscriptionAsync(tenantId);
        if (!CanViewTeamMembers(currentUser, subscription?.Plan?.Name))
        {
            return Forbid();
        }

        return Ok(await LoadTeamMembersAsync(tenantId, currentUser.Id));
    }

    [HttpPut("team/{id:int}")]
    public async Task<ActionResult<CustomerSettingsTeamMemberResponse>> UpdateTeamMember(int id, [FromBody] UpdateCustomerSettingsTeamMemberRequest request)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var currentUser = await GetCurrentUserAsync(tenantId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var forbidden = RequireDirector(currentUser.Role);
        if (forbidden is not null)
        {
            return forbidden;
        }

        string nextRole;
        string nextStatus;

        try
        {
            nextRole = CleanEditableRole(request.Role);
            nextStatus = CleanEditableStatus(request.Status);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var user = await _context.Users.FirstOrDefaultAsync(existing => existing.Id == id && existing.TenantId == tenantId);
        if (user is null || !CustomerRoles.IsCustomerRole(user.Role))
        {
            return NotFound();
        }

        if (CustomerRoles.IsDirector(user.Role))
        {
            return BadRequest(new { error = "Owner access cannot be changed from customer settings." });
        }

        user.Role = nextRole;
        user.AccountStatus = nextStatus;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToTeamMemberResponse(user, currentUser.Id, canEdit: true));
    }

    private CustomerSettingsResponse BuildResponse(
        User currentUser,
        BusinessSettings settings,
        Subscription? subscription,
        IReadOnlyList<CustomerSettingsTeamMemberResponse> teamMembers)
    {
        return new CustomerSettingsResponse(
            BuildAccountResponse(currentUser),
            ToBusinessResponse(settings),
            BuildSecurityResponse(currentUser),
            BuildPlanBillingResponse(currentUser, subscription),
            new JobDefaultsSettingsResponse(settings.DefaultJobPriority, settings.DefaultScheduleView, CanManageTenantSettings(currentUser.Role)),
            BuildDocumentDefaultsResponse(settings, CanManageTenantSettings(currentUser.Role)),
            BuildReportDefaultsResponse(settings, CanManageTenantSettings(currentUser.Role)),
            BuildInventoryDefaultsResponse(settings, CanManageTenantSettings(currentUser.Role)),
            new NotificationSettingsResponse(
                AutomatedSenderEmail,
                SupportInboxEmail,
                SalesInboxEmail,
                GeneralInboxEmail,
                settings.ReplyToEmail,
                "Configured"),
            teamMembers);
    }

    private AccountSettingsResponse BuildAccountResponse(User user)
    {
        return new AccountSettingsResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            $"{user.FirstName} {user.LastName}".Trim(),
            user.Email,
            user.Role,
            user.BusinessName ?? "TradeLike",
            user.OwnerName,
            user.OwnerPhone,
            user.AccountStatus,
            user.SubscriptionPlan,
            user.BillingStatus,
            true);
    }

    private SecuritySettingsResponse BuildSecurityResponse(User user)
    {
        DateTime? sessionExpiresAtUtc = null;
        if (long.TryParse(User.FindFirstValue("exp"), out var expUnix))
        {
            sessionExpiresAtUtc = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
        }

        return new SecuritySettingsResponse(
            user.IsEmailVerified,
            user.EmailVerificationSentAt,
            user.PasswordResetRequired,
            user.LastLoginAt,
            sessionExpiresAtUtc);
    }

    private PlanBillingSettingsResponse BuildPlanBillingResponse(User currentUser, Subscription? subscription)
    {
        return new PlanBillingSettingsResponse(
            subscription?.Plan?.Name ?? currentUser.SubscriptionPlan,
            subscription?.Status ?? currentUser.BillingStatus,
            subscription?.Plan?.MonthlyPricePence,
            subscription?.Plan?.MaxIncludedUsers,
            subscription?.SeatsPurchased ?? 1,
            subscription?.BillingStartUtc,
            subscription?.NextInvoiceDateUtc,
            currentUser.TrialEndsAt,
            currentUser.AccountStatus);
    }

    private static DocumentDefaultsSettingsResponse BuildDocumentDefaultsResponse(BusinessSettings settings, bool canEdit)
    {
        return new DocumentDefaultsSettingsResponse(
            settings.DefaultVatRate,
            settings.QuotePrefix,
            settings.InvoicePrefix,
            settings.QuoteExpiryDays,
            settings.PaymentTerms,
            settings.DefaultQuoteNotes,
            settings.DefaultInvoiceNotes,
            settings.ReplyToEmail,
            settings.EmailFooter,
            canEdit);
    }

    private static ReportDefaultsSettingsResponse BuildReportDefaultsResponse(BusinessSettings settings, bool canEdit)
    {
        return new ReportDefaultsSettingsResponse(
            settings.DefaultReportRange,
            settings.IncludeCompletedInReports,
            settings.IncludeArchivedInReports,
            canEdit);
    }

    private static InventoryDefaultsSettingsResponse BuildInventoryDefaultsResponse(BusinessSettings settings, bool canEdit)
    {
        return new InventoryDefaultsSettingsResponse(
            settings.LowStockThreshold,
            settings.PurchaseOrderPrefix,
            canEdit);
    }

    private async Task<IReadOnlyList<CustomerSettingsTeamMemberResponse>> LoadTeamMembersAsync(int tenantId, int currentUserId)
    {
        var users = await _context.Users
            .AsNoTracking()
            .Where(user => user.TenantId == tenantId && CustomerRoles.EmployeeRoles.Contains(user.Role))
            .OrderByDescending(user => user.Role == CustomerRoles.Director)
            .ThenBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .ToListAsync();

        return users
            .Select(user => ToTeamMemberResponse(user, currentUserId, canEdit: !CustomerRoles.IsDirector(user.Role)))
            .ToList();
    }

    private static CustomerSettingsTeamMemberResponse ToTeamMemberResponse(User user, int currentUserId, bool canEdit)
    {
        return new CustomerSettingsTeamMemberResponse(
            user.Id,
            $"{user.FirstName} {user.LastName}".Trim(),
            user.Email,
            user.Role,
            user.AccountStatus,
            user.Id == currentUserId,
            canEdit,
            canEdit);
    }

    private async Task<User?> GetCurrentUserAsync(int tenantId)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return null;
        }

        return await _context.Users.FirstOrDefaultAsync(user => user.Id == userId && user.TenantId == tenantId);
    }

    private async Task<Subscription?> LoadSubscriptionAsync(int tenantId)
    {
        return await _context.Subscriptions
            .AsNoTracking()
            .Include(subscription => subscription.Plan)
            .FirstOrDefaultAsync(subscription => subscription.TenantId == tenantId);
    }

    private async Task<BusinessSettings> GetOrCreateSettingsAsync(int tenantId, User currentUser)
    {
        var settings = await _context.BusinessSettings.FirstOrDefaultAsync(existing => existing.TenantId == tenantId);
        if (settings is not null)
        {
            return settings;
        }

        settings = new BusinessSettings
        {
            TenantId = tenantId,
            BusinessName = currentUser.BusinessName?.Trim() ?? "TradeLike",
            Country = "United Kingdom",
            Email = currentUser.Email,
            DefaultVatRate = 20m,
            QuotePrefix = "Q",
            InvoicePrefix = "INV",
            PaymentTerms = "Payment due within 14 days.",
            QuoteExpiryDays = 30,
            DefaultJobPriority = "Normal",
            DefaultScheduleView = "Week",
            DefaultReportRange = "30d",
            IncludeCompletedInReports = true,
            IncludeArchivedInReports = false,
            LowStockThreshold = 5,
            PurchaseOrderPrefix = "PO",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.BusinessSettings.AddAsync(settings);
        await _context.SaveChangesAsync();
        return settings;
    }

    private static BusinessSettingsResponse ToBusinessResponse(BusinessSettings settings)
    {
        return new BusinessSettingsResponse(
            settings.Id,
            settings.TenantId,
            settings.BusinessName,
            settings.LegalName,
            settings.LogoUrl,
            settings.AddressLine1,
            settings.AddressLine2,
            settings.Town,
            settings.County,
            settings.Postcode,
            settings.Country,
            settings.Phone,
            settings.Email,
            settings.Website,
            settings.VatNumber,
            settings.CompanyNumber,
            settings.DefaultVatRate,
            settings.QuotePrefix,
            settings.InvoicePrefix,
            settings.PaymentTerms,
            settings.QuoteExpiryDays,
            settings.DefaultQuoteNotes,
            settings.DefaultInvoiceNotes,
            settings.ReplyToEmail,
            settings.DefaultJobPriority,
            settings.DefaultScheduleView,
            settings.DefaultReportRange,
            settings.IncludeCompletedInReports,
            settings.IncludeArchivedInReports,
            settings.LowStockThreshold,
            settings.PurchaseOrderPrefix,
            settings.BankName,
            settings.BankAccountName,
            settings.BankSortCode,
            settings.BankAccountNumber,
            settings.EmailFooter,
            settings.CreatedAt,
            settings.UpdatedAt);
    }

    private static ObjectResult? RequireManagerOrDirector(string role)
    {
        return CustomerRoles.IsManagerOrDirector(role)
            ? null
            : new ObjectResult(new { error = "You do not have permission to manage this settings section." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
    }

    private static ObjectResult? RequireDirector(string role)
    {
        return CustomerRoles.IsDirector(role)
            ? null
            : new ObjectResult(new { error = "Only the account owner can change team permissions." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
    }

    private static bool CanManageTenantSettings(string? role)
    {
        return CustomerRoles.IsManagerOrDirector(role);
    }

    private static bool CanViewTeamMembers(User user, string? planName)
    {
        return CustomerRoles.IsManagerOrDirector(user.Role) &&
            IsTeamPlan(planName ?? user.SubscriptionPlan);
    }

    private static bool IsTeamPlan(string? plan)
    {
        return plan is not null &&
            (plan.Equals("Team", StringComparison.OrdinalIgnoreCase) ||
             plan.Equals("Business", StringComparison.OrdinalIgnoreCase) ||
             plan.Equals("Enterprise", StringComparison.OrdinalIgnoreCase));
    }

    private static string Required(string? value, string label, int maxLength)
    {
        var cleaned = Clean(value, maxLength);
        if (string.IsNullOrWhiteSpace(cleaned))
        {
            throw new ValidationException($"{label} is required.");
        }

        return cleaned;
    }

    private static string? Clean(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var cleaned = value.Trim();
        if (cleaned.Length > maxLength)
        {
            throw new ValidationException($"Value cannot be longer than {maxLength} characters.");
        }

        return cleaned;
    }

    private static string? CleanEmail(string? value)
    {
        var cleaned = Clean(value, 255);
        if (cleaned is null)
        {
            return null;
        }

        if (!new EmailAddressAttribute().IsValid(cleaned))
        {
            throw new ValidationException("Email must be a valid email address.");
        }

        return cleaned.ToLowerInvariant();
    }

    private static string CleanEditableRole(string value)
    {
        return value.Trim() switch
        {
            CustomerRoles.Manager => CustomerRoles.Manager,
            CustomerRoles.Employee => CustomerRoles.Employee,
            _ => throw new ValidationException("Role must be CustomerManager or CustomerEmployee.")
        };
    }

    private static string CleanEditableStatus(string value)
    {
        var cleaned = value.Trim();
        return cleaned switch
        {
            "Active" => "Active",
            "Suspended" => "Suspended",
            "Cancelled" => "Cancelled",
            _ => throw new ValidationException("Status must be Active, Suspended or Cancelled.")
        };
    }

    private static decimal ClampVat(decimal value)
    {
        if (value < 0 || value > 100)
        {
            throw new ValidationException("Default VAT rate must be between 0 and 100.");
        }

        return Math.Round(value, 2);
    }

    private static int ClampDays(int value, string label)
    {
        if (value < 1 || value > 365)
        {
            throw new ValidationException($"{label} must be between 1 and 365.");
        }

        return value;
    }

    private static int ClampLowStockThreshold(int value)
    {
        if (value < 0 || value > 100000)
        {
            throw new ValidationException("Low stock threshold must be between 0 and 100000.");
        }

        return value;
    }

    private static string NormalizePriority(string value)
    {
        var cleaned = Required(value, "Default job priority", 30);
        return cleaned.Equals("high", StringComparison.OrdinalIgnoreCase)
            ? "High"
            : cleaned.Equals("low", StringComparison.OrdinalIgnoreCase)
                ? "Low"
                : "Normal";
    }

    private static string NormalizeScheduleView(string value)
    {
        var cleaned = Required(value, "Default schedule view", 30);
        return cleaned.Equals("day", StringComparison.OrdinalIgnoreCase)
            ? "Day"
            : "Week";
    }

    private static string NormalizeReportRange(string value)
    {
        var cleaned = Required(value, "Default report range", 40).ToLowerInvariant();
        return cleaned switch
        {
            "7d" => "7d",
            "30d" => "30d",
            "90d" => "90d",
            "12m" => "12m",
            _ => throw new ValidationException("Default report range must be one of 7d, 30d, 90d or 12m.")
        };
    }

    private static void ValidateBusinessSettings(BusinessSettings settings)
    {
        if (settings.QuoteExpiryDays < 1 || settings.QuoteExpiryDays > 365)
        {
            throw new ValidationException("Quote expiry days must be between 1 and 365.");
        }
    }
}
