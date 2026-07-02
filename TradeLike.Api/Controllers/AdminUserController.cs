using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Services;
using TradeLike.Api.Services.Plans;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin")]
public class AdminUserController : ControllerBase
{
    private const string PermanentDirectorEmail = "admin@tradelike.co.uk";

    private static readonly string[] StaffRoles =
    {
        "Director",
        "Admin",
        "Support",
        "Junior Developer",
        "Developer",
        "Senior Developer",
        "Marketing",
        "Customer Service",
        "Operations Coordinator",
        "Personal Assistant"
    };

    private static readonly string[] CustomerAccountRoles =
    {
        "Customer",
        "CustomerDirector",
        "CustomerManager",
        "CustomerEmployee"
    };

    private static readonly string[] AllowedAccountStatuses =
    {
        "Trial",
        "Active",
        "PastDue",
        "Suspended",
        "Cancelled"
    };

    private static readonly string[] AllowedDiscountTypes =
    {
        "None",
        "Amount",
        "Percentage"
    };

    private static readonly string[] AllowedSubscriptionPlans =
    {
        "Trial",
        "Solo",
        "Team",
        "Business",
        "Enterprise",
        "Internal"
    };

    private static readonly string[] AllowedBillingStatuses =
    {
        "Trial",
        "Active",
        "PastDue",
        "GracePeriod",
        "Suspended",
        "Cancelled",
        "Internal"
    };

    private static readonly string[] AllowedHealthStatuses =
    {
        "Green",
        "Amber",
        "Red"
    };

    private readonly TradeLikeDbContext _context;
    private readonly PasswordResetService? _passwordResetService;

    public AdminUserController(
        TradeLikeDbContext context,
        PasswordResetService? passwordResetService = null)
    {
        _context = context;
        _passwordResetService = passwordResetService;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> GetUsers(
        [FromQuery] string? search)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanSeeCustomerAccounts(actor))
        {
            return Forbid();
        }

        var query = _context.Users
            .AsNoTracking()
            .Where(user =>
                CustomerAccountRoles.Contains(user.Role) ||
                (!StaffRoles.Contains(user.Role) && user.SubscriptionPlan != "Internal"));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim();

            query = query.Where(user =>
                user.FirstName.Contains(trimmedSearch) ||
                user.LastName.Contains(trimmedSearch) ||
                user.Email.Contains(trimmedSearch) ||
                user.AccountStatus.Contains(trimmedSearch) ||
                (user.BusinessName != null && user.BusinessName.Contains(trimmedSearch)) ||
                (user.OwnerName != null && user.OwnerName.Contains(trimmedSearch)) ||
                user.SubscriptionPlan.Contains(trimmedSearch) ||
                user.BillingStatus.Contains(trimmedSearch) ||
                user.HealthStatus.Contains(trimmedSearch) ||
                (user.AdminTags != null && user.AdminTags.Contains(trimmedSearch)) ||
                (user.AccountSource != null && user.AccountSource.Contains(trimmedSearch)));
        }

        var users = await query
            .OrderByDescending(user => user.CreatedAt)
            .Take(300)
            .ToListAsync();

        return Ok(users.Select(ToResponse).ToList());
    }

    [HttpGet("customers")]
    public Task<ActionResult<IReadOnlyList<AdminUserResponse>>> GetCustomers(
        [FromQuery] string? search)
    {
        return GetUsers(search);
    }

    [HttpPost("users")]
    public async Task<ActionResult<AdminUserResponse>> CreateUser(
        [FromBody] CreateAdminUserRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanCreateCustomers(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await CreateCustomerUserInternal(request);
            PasswordResetIssueResult? resetIssue = null;

            if (_passwordResetService is not null)
            {
                resetIssue = await _passwordResetService.IssueResetAsync(user, HttpContext.RequestAborted);
            }

            await LogAsync(
                actor,
                "CustomerAccountCreated",
                "User",
                user.Id,
                user.Email,
                $"Created customer account for {user.Email}.",
                BuildCustomerDetails(user));

            await LogAsync(
                actor,
                "PasswordResetLinkSent",
                "User",
                user.Id,
                user.Email,
                $"Sent password setup link for {user.Email}.",
                resetIssue is null
                    ? "Password reset service was not configured; account requires password reset."
                    : $"Setup link expires at {resetIssue.ExpiresAtUtc:u}. Token was not logged.");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("users/{id:int}/account")]
    public async Task<ActionResult<AdminUserResponse>> UpdateAccount(
        int id,
        [FromBody] UpdateAdminUserAccountRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanEditCustomers(actor) &&
            !CanManageDiscounts(actor) &&
            !CanManageFreeMonths(actor) &&
            !CanManageSubscriptions(actor) &&
            !CanEditCustomerNotes(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await _context.Users.FindAsync(id);

            if (user is null || !IsCustomerAccountUser(user))
            {
                return NotFound();
            }

            if (string.Equals(request.AccountStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                !CanCancelCustomers(actor))
            {
                return Forbid();
            }

            var before = BuildCustomerDetails(user);
            var reason = CleanRequiredReason(request.Reason);

            var accountStatus = Canonicalise(request.AccountStatus, AllowedAccountStatuses);
            var discountType = CanonicaliseDiscountType(request.DiscountType);
            var subscriptionPlan = Canonicalise(request.SubscriptionPlan, AllowedSubscriptionPlans);
            var billingStatus = Canonicalise(request.BillingStatus, AllowedBillingStatuses);
            var healthStatus = Canonicalise(request.HealthStatus, AllowedHealthStatuses);
            var planService = new SubscriptionPlanService(_context);
            PlanChangeResult? planChange = null;

            if ((!string.Equals(user.SubscriptionPlan, subscriptionPlan, StringComparison.OrdinalIgnoreCase) ||
                    !string.Equals(user.BillingStatus, billingStatus, StringComparison.OrdinalIgnoreCase) ||
                    user.TrialEndsAt != request.TrialEndsAt) &&
                !CanManageSubscriptions(actor))
            {
                return Forbid();
            }

            if ((!string.Equals(user.DiscountType, discountType, StringComparison.OrdinalIgnoreCase) ||
                    user.DiscountValue != RoundMoney(request.DiscountValue)) &&
                !CanManageDiscounts(actor))
            {
                return Forbid();
            }

            if ((user.FreeMonths != request.FreeMonths ||
                    user.FreeMonthsExpireAt != request.FreeMonthsExpireAt) &&
                !CanManageFreeMonths(actor))
            {
                return Forbid();
            }

            if ((!string.Equals(user.AccountStatus, accountStatus, StringComparison.OrdinalIgnoreCase) ||
                    !string.Equals(user.HealthStatus, healthStatus, StringComparison.OrdinalIgnoreCase)) &&
                !CanManageAccounts(actor))
            {
                return Forbid();
            }

            user.AccountStatus = accountStatus;
            user.DiscountType = discountType;
            user.DiscountValue = RoundMoney(request.DiscountValue);
            user.FreeMonths = request.FreeMonths;
            user.FreeMonthsExpireAt = request.FreeMonthsExpireAt;
            user.BusinessName = CleanOptional(request.BusinessName);
            user.OwnerName = CleanOptional(request.OwnerName);
            user.OwnerPhone = CleanOptional(request.OwnerPhone);
            user.TrialEndsAt = request.TrialEndsAt;
            user.AdminTags = CleanOptional(request.AdminTags);
            user.SupportNotes = CleanOptional(request.SupportNotes);
            user.HealthStatus = healthStatus;
            user.AccountSource = CleanOptional(request.AccountSource);
            user.CancelReason = CleanOptional(request.CancelReason);
            user.AdminNotes = CleanOptional(request.AdminNotes);
            user.UpdatedAt = DateTime.UtcNow;

            if (user.AccountStatus != "Cancelled" && user.BillingStatus != "Cancelled")
            {
                user.CancelReason = null;
            }

            if (!string.Equals(user.SubscriptionPlan, subscriptionPlan, StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(user.BillingStatus, billingStatus, StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(subscriptionPlan, "Trial", StringComparison.OrdinalIgnoreCase))
                {
                    user.SubscriptionPlan = subscriptionPlan;
                    user.BillingStatus = billingStatus;
                    await planService.SyncBillingStatusAsync(user, billingStatus);
                }
                else
                {
                    var seats = await planService.GetCompatibleSeatCountAsync(user, subscriptionPlan);
                    planChange = await planService.ApplyCustomerPlanChangeAsync(
                        user,
                        subscriptionPlan,
                        seats,
                        billingStatus);
                }
            }
            else
            {
                user.SubscriptionPlan = subscriptionPlan;
                user.BillingStatus = billingStatus;
            }

            ValidateAccount(user);

            var after = BuildCustomerDetails(user);
            var planDetails = planChange is null
                ? string.Empty
                : $" PlanChange: {planChange.ToAuditDetails(reason)}";

            await LogAsync(
                actor,
                "CustomerAccountUpdated",
                "User",
                user.Id,
                user.Email,
                $"Updated customer account for {user.Email}.",
                $"Reason: {reason}. Before: {before}. After: {after}.{planDetails}");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("users/{id:int}/reactivate")]
    public async Task<ActionResult<AdminUserResponse>> ReactivateCustomer(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanManageAccounts(actor))
        {
            return Forbid();
        }

        var user = await _context.Users.FindAsync(id);

        if (user is null || !IsCustomerAccountUser(user))
        {
            return NotFound();
        }

        var before = BuildCustomerDetails(user);

        user.AccountStatus = "Active";
        user.BillingStatus = "Active";
        user.CancelReason = null;
        user.HealthStatus = "Green";
        user.UpdatedAt = DateTime.UtcNow;
        await new SubscriptionPlanService(_context).SyncBillingStatusAsync(user, user.BillingStatus);

        await LogAsync(
            actor,
            "CustomerReactivated",
            "User",
            user.Id,
            user.Email,
            $"Reactivated customer account for {user.Email}.",
            $"Before: {before}. After: {BuildCustomerDetails(user)}.");

        await _context.SaveChangesAsync();

        return Ok(ToResponse(user));
    }

    [HttpPut("customers/{id:int}/plan")]
    public async Task<ActionResult<AdminUserResponse>> UpdateCustomerPlan(
        int id,
        [FromBody] UpdateCustomerPlanRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanManageSubscriptions(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await FindCustomerAccountAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            var reason = CleanRequiredReason(request.Reason);
            var billingStatus = string.IsNullOrWhiteSpace(request.BillingStatus)
                ? user.BillingStatus
                : Canonicalise(request.BillingStatus, AllowedBillingStatuses);

            var before = BuildCustomerDetails(user);
            var planChange = await new SubscriptionPlanService(_context).ApplyCustomerPlanChangeAsync(
                user,
                request.Plan,
                request.SeatsPurchased,
                billingStatus);

            ValidateAccount(user);

            await LogAsync(
                actor,
                "PlanChanged",
                "User",
                user.Id,
                user.Email,
                $"Changed plan for {user.Email} to {planChange.NewPlan}.",
                $"{planChange.ToAuditDetails(reason)} Before: {before}. After: {BuildCustomerDetails(user)}.");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("customers/{id:int}/discount")]
    public async Task<ActionResult<AdminUserResponse>> UpdateCustomerDiscount(
        int id,
        [FromBody] UpdateCustomerDiscountRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanManageDiscounts(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await FindCustomerAccountAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            var reason = CleanRequiredReason(request.Reason);
            var before = BuildCustomerDetails(user);

            user.DiscountType = CanonicaliseDiscountType(request.DiscountType);
            user.DiscountValue = user.DiscountType == "None" ? 0 : RoundMoney(request.DiscountValue);
            user.AdminNotes = MergeAdminNote(user.AdminNotes, request.ExpiresAtUtc.HasValue ? $"Discount expires {request.ExpiresAtUtc:u}" : null);
            user.UpdatedAt = DateTime.UtcNow;

            ValidateAccount(user);

            await LogAsync(
                actor,
                "DiscountChanged",
                "User",
                user.Id,
                user.Email,
                $"Changed discount for {user.Email}.",
                $"Reason: {reason}. Before: {before}. After: {BuildCustomerDetails(user)}.");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("customers/{id:int}/free-months")]
    public async Task<ActionResult<AdminUserResponse>> UpdateCustomerFreeMonths(
        int id,
        [FromBody] UpdateCustomerFreeMonthsRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanManageFreeMonths(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await FindCustomerAccountAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            var reason = CleanRequiredReason(request.Reason);
            var before = BuildCustomerDetails(user);

            user.FreeMonths = request.FreeMonths;
            user.FreeMonthsExpireAt = request.ExpiresAtUtc;
            user.UpdatedAt = DateTime.UtcNow;

            ValidateAccount(user);

            await LogAsync(
                actor,
                "FreeMonthsChanged",
                "User",
                user.Id,
                user.Email,
                $"Changed free months for {user.Email}.",
                $"Reason: {reason}. Before: {before}. After: {BuildCustomerDetails(user)}.");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("customers/{id:int}/status")]
    public async Task<ActionResult<AdminUserResponse>> UpdateCustomerStatus(
        int id,
        [FromBody] UpdateCustomerStatusRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanManageAccounts(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await FindCustomerAccountAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            var status = Canonicalise(request.AccountStatus, AllowedAccountStatuses);

            if (status == "Cancelled" && !CanCancelCustomers(actor))
            {
                return Forbid();
            }

            var reason = CleanRequiredReason(request.Reason);
            var before = BuildCustomerDetails(user);

            user.AccountStatus = status;

            if (!string.IsNullOrWhiteSpace(request.BillingStatus))
            {
                user.BillingStatus = Canonicalise(request.BillingStatus, AllowedBillingStatuses);
                await new SubscriptionPlanService(_context).SyncBillingStatusAsync(user, user.BillingStatus);
            }

            if (status == "Active")
            {
                user.CancelReason = null;
            }
            else if (status is "Suspended" or "Cancelled")
            {
                user.CancelReason = reason;
            }

            user.UpdatedAt = DateTime.UtcNow;

            ValidateAccount(user);

            var action = status switch
            {
                "Suspended" => "AccountSuspended",
                "Cancelled" => "AccountCancelled",
                "Active" => "AccountReactivated",
                _ => "AccountStatusChanged"
            };

            await LogAsync(
                actor,
                action,
                "User",
                user.Id,
                user.Email,
                $"Changed account status for {user.Email} to {status}.",
                $"Reason: {reason}. Before: {before}. After: {BuildCustomerDetails(user)}.");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("customers/{id:int}/support-notes")]
    public async Task<ActionResult<AdminUserResponse>> AddCustomerSupportNote(
        int id,
        [FromBody] AddCustomerSupportNoteRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanEditCustomerNotes(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await FindCustomerAccountAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            var note = CleanRequired(request.Note, "Support note");
            var tags = request.Tags
                .Where(tag => !string.IsNullOrWhiteSpace(tag))
                .Select(tag => tag.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            user.SupportNotes = AppendSupportNote(user.SupportNotes, actor, note, tags);
            user.AdminTags = MergeTags(user.AdminTags, tags);
            user.UpdatedAt = DateTime.UtcNow;

            ValidateAccount(user);

            await LogAsync(
                actor,
                "SupportNoteAdded",
                "User",
                user.Id,
                user.Email,
                $"Added support note for {user.Email}.",
                $"Note: {note}. Tags: {string.Join(", ", tags)}");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("users/{id:int}/timeline")]
    public async Task<ActionResult<IReadOnlyList<AdminAuditLogResponse>>> GetCustomerTimeline(
        int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanSeeCustomerAccounts(actor))
        {
            return Forbid();
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(existingUser => existingUser.Id == id);

        if (user is null || !IsCustomerAccountUser(user))
        {
            return NotFound();
        }

        var logs = await _context.AdminAuditLogs
            .AsNoTracking()
            .Where(log =>
                log.TargetId == user.Id ||
                log.TargetEmail == user.Email)
            .OrderByDescending(log => log.CreatedAt)
            .Take(200)
            .ToListAsync();

        return Ok(logs.Select(ToAuditLogResponse).ToList());
    }

    [HttpGet("customers/{id:int}/audit")]
    public Task<ActionResult<IReadOnlyList<AdminAuditLogResponse>>> GetCustomerAudit(
        int id)
    {
        return GetCustomerTimeline(id);
    }

    [HttpGet("customers/{id:int}/users")]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> GetCustomerTenantUsers(
        int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanSeeCustomerAccounts(actor))
        {
            return Forbid();
        }

        var customer = await FindCustomerAccountAsync(id, asNoTracking: true);

        if (customer is null)
        {
            return NotFound();
        }

        var users = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.TenantId == customer.TenantId &&
                CustomerAccountRoles.Contains(user.Role))
            .OrderBy(user => user.Role == "CustomerDirector" || user.Role == "Customer" ? 0 : 1)
            .ThenBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .ToListAsync();

        return Ok(users.Select(ToResponse).ToList());
    }

    [HttpPost("users/{id:int}/reset-password")]
    public async Task<ActionResult<object>> ResetPassword(
        int id,
        [FromBody] ResetAdminUserPasswordRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanResetPasswords(actor))
        {
            return Forbid();
        }

        try
        {
            if (!request.SendResetLink && !request.ForcePasswordReset)
            {
                throw new ValidationException("Choose at least one password reset action.");
            }

            var user = await _context.Users.FindAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            if (IsPermanentDirector(user) && !IsPermanentDirector(actor))
            {
                return Forbid();
            }

            PasswordResetIssueResult? resetIssue = null;

            if (request.SendResetLink)
            {
                if (_passwordResetService is null)
                {
                    throw new InvalidOperationException("Password reset service is not configured.");
                }

                resetIssue = await _passwordResetService.IssueResetAsync(user, HttpContext.RequestAborted);

                await LogAsync(
                    actor,
                    "PasswordResetLinkSent",
                    "User",
                    user.Id,
                    user.Email,
                    $"Sent password reset link for {user.Email}.",
                    $"Reset link expires at {resetIssue.ExpiresAtUtc:u}. Token was not logged.");
            }

            if (request.ForcePasswordReset)
            {
                user.PasswordResetRequired = true;
                user.UpdatedAt = DateTime.UtcNow;

                await LogAsync(
                    actor,
                    "PasswordResetForced",
                    "User",
                    user.Id,
                    user.Email,
                    $"Forced password reset for {user.Email}.",
                    "User must reset their password on next sign-in.");
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = request.SendResetLink && request.ForcePasswordReset
                    ? "Password reset link sent and reset required on next sign-in."
                    : request.SendResetLink
                        ? "Password reset link sent."
                        : "Password reset required on next sign-in.",
                resetLink = resetIssue?.DevelopmentResetLink,
                expiresAtUtc = resetIssue?.ExpiresAtUtc,
                user = ToResponse(user)
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("users/{id:int}/mark-email-verified")]
    public async Task<ActionResult<AdminUserResponse>> MarkEmailVerified(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanVerifyEmails(actor))
        {
            return Forbid();
        }

        var user = await _context.Users.FindAsync(id);

        if (user is null)
        {
            return NotFound();
        }

        if (IsPermanentDirector(user) && !IsPermanentDirector(actor))
        {
            return Forbid();
        }

        user.IsEmailVerified = true;
        user.UpdatedAt = DateTime.UtcNow;

        await LogAsync(
            actor,
            "EmailMarkedVerified",
            "User",
            user.Id,
            user.Email,
            $"Marked email as verified for {user.Email}.",
            null);

        await _context.SaveChangesAsync();

        return Ok(ToResponse(user));
    }

    [HttpPost("users/{id:int}/send-verification-email")]
    public async Task<ActionResult<object>> SendVerificationEmail(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanSendEmails(actor) && !CanVerifyEmails(actor))
        {
            return Forbid();
        }

        var user = await _context.Users.FindAsync(id);

        if (user is null)
        {
            return NotFound();
        }

        if (IsPermanentDirector(user) && !IsPermanentDirector(actor))
        {
            return Forbid();
        }

        user.EmailVerificationSentAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await LogAsync(
            actor,
            "VerificationEmailSendRecorded",
            "User",
            user.Id,
            user.Email,
            $"Recorded verification email send for {user.Email}.",
            "Real email sending will be wired later with the email provider.");

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Verification email send action recorded. Real email sending will be wired when we add the email provider.",
            user = ToResponse(user)
        });
    }

    [HttpPost("users/{id:int}/send-onboarding-email")]
    public async Task<ActionResult<object>> SendOnboardingEmail(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanSendEmails(actor))
        {
            return Forbid();
        }

        var user = await _context.Users.FindAsync(id);

        if (user is null || !IsCustomerAccountUser(user))
        {
            return NotFound();
        }

        user.OnboardingEmailSentAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await LogAsync(
            actor,
            "OnboardingEmailSendRecorded",
            "User",
            user.Id,
            user.Email,
            $"Recorded onboarding email send for {user.Email}.",
            "Real onboarding email sending will be wired when the email provider is added.");

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Onboarding email send action recorded. Real email sending will be wired when we add the email provider.",
            user = ToResponse(user)
        });
    }

    [HttpGet("staff")]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> GetStaff()
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanViewStaff(actor))
        {
            return Forbid();
        }

        var staff = await _context.Users
            .AsNoTracking()
            .Where(user => StaffRoles.Contains(user.Role))
            .OrderBy(user => user.AccountStatus == "Cancelled" ? 1 : 0)
            .ThenBy(user => user.Role == "Director" ? 0 : 1)
            .ThenBy(user => user.FirstName)
            .ToListAsync();

        return Ok(staff.Select(ToResponse).ToList());
    }

    [HttpPost("staff")]
    public async Task<ActionResult<AdminUserResponse>> CreateStaff(
        [FromBody] CreateStaffUserRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanCreateStaff(actor))
        {
            return Forbid();
        }

        if (string.Equals(request.Role, "Director", StringComparison.OrdinalIgnoreCase) &&
            !IsPermanentDirector(actor))
        {
            return Forbid();
        }

        try
        {
            var staff = await CreateStaffUserInternal(request);

            await LogAsync(
                actor,
                "StaffAccountCreated",
                "User",
                staff.Id,
                staff.Email,
                $"Created staff account for {staff.Email}.",
                BuildPermissionDetails(staff));

            await _context.SaveChangesAsync();

            return Ok(ToResponse(staff));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("staff/{id:int}/permissions")]
    public async Task<ActionResult<AdminUserResponse>> UpdateStaffPermissions(
        int id,
        [FromBody] UpdateStaffPermissionsRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanEditStaffPermissions(actor))
        {
            return Forbid();
        }

        try
        {
            var staff = await _context.Users.FindAsync(id);

            if (staff is null || !StaffRoles.Contains(staff.Role))
            {
                return NotFound();
            }

            if (IsPermanentDirector(staff))
            {
                if (!IsPermanentDirector(actor))
                {
                    return Forbid();
                }

                request = new UpdateStaffPermissionsRequest
                {
                    Role = "Director",
                    PersonalAssistantTo = string.Empty,
                    AccountStatus = "Active",
                    CanManageAccounts = true,
                    CanManageStaff = true,
                    CanManageBilling = true,
                    CanManageSecurity = true,
                    CanViewAuditLogs = true,
                    CanCreateCustomers = true,
                    CanEditCustomers = true,
                    CanCancelCustomers = true,
                    CanResetPasswords = true,
                    CanVerifyEmails = true,
                    CanSendEmails = true,
                    CanManageDiscounts = true,
                    CanManageFreeMonths = true,
                    CanViewCustomerNotes = true,
                    CanEditCustomerNotes = true,
                    CanViewBilling = true,
                    CanManageSubscriptions = true,
                    CanExportData = true,
                    CanImpersonateCustomer = true,
                    CanDeleteData = true,
                    CanViewStaff = true,
                    CanCreateStaff = true,
                    CanCancelStaff = true,
                    CanEditStaffPermissions = true,
                    CanViewSecurityLogs = true,
                    AdminNotes = request.AdminNotes
                };
            }

            if (staff.Id == actor.Id &&
                !string.Equals(request.Role, "Director", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("You cannot remove your own Director role.");
            }

            if (string.Equals(request.Role, "Director", StringComparison.OrdinalIgnoreCase) &&
                !IsPermanentDirector(actor))
            {
                return Forbid();
            }

            if (string.Equals(request.AccountStatus, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                !CanCancelStaff(actor))
            {
                return Forbid();
            }

            var before = BuildPermissionDetails(staff);

            staff.Role = Canonicalise(request.Role, StaffRoles);
            staff.PersonalAssistantTo = staff.Role == "Personal Assistant"
                ? CleanOptional(request.PersonalAssistantTo)
                : null;
            staff.AccountStatus = Canonicalise(request.AccountStatus, AllowedAccountStatuses);
            staff.CanManageAccounts = request.CanManageAccounts;
            staff.CanManageStaff = request.CanManageStaff;
            staff.CanManageBilling = request.CanManageBilling;
            staff.CanManageSecurity = request.CanManageSecurity;
            staff.CanViewAuditLogs = request.CanViewAuditLogs;
            staff.CanCreateCustomers = request.CanCreateCustomers;
            staff.CanEditCustomers = request.CanEditCustomers;
            staff.CanCancelCustomers = request.CanCancelCustomers;
            staff.CanResetPasswords = request.CanResetPasswords;
            staff.CanVerifyEmails = request.CanVerifyEmails;
            staff.CanSendEmails = request.CanSendEmails;
            staff.CanManageDiscounts = request.CanManageDiscounts;
            staff.CanManageFreeMonths = request.CanManageFreeMonths;
            staff.CanViewCustomerNotes = request.CanViewCustomerNotes;
            staff.CanEditCustomerNotes = request.CanEditCustomerNotes;
            staff.CanViewBilling = request.CanViewBilling;
            staff.CanManageSubscriptions = request.CanManageSubscriptions;
            staff.CanExportData = request.CanExportData;
            staff.CanImpersonateCustomer = request.CanImpersonateCustomer;
            staff.CanDeleteData = request.CanDeleteData;
            staff.CanViewStaff = request.CanViewStaff;
            staff.CanCreateStaff = request.CanCreateStaff;
            staff.CanCancelStaff = request.CanCancelStaff;
            staff.CanEditStaffPermissions = request.CanEditStaffPermissions;
            staff.CanViewSecurityLogs = request.CanViewSecurityLogs;
            staff.AdminNotes = CleanOptional(request.AdminNotes);
            staff.UpdatedAt = DateTime.UtcNow;

            if (staff.Role == "Director" || IsPermanentDirector(staff))
            {
                GiveDirectorPermissions(staff);
                staff.Role = "Director";
                staff.AccountStatus = "Active";
                staff.PersonalAssistantTo = null;
            }

            ValidateStaff(staff);

            var after = BuildPermissionDetails(staff);

            await LogAsync(
                actor,
                "StaffPermissionsUpdated",
                "User",
                staff.Id,
                staff.Email,
                $"Updated staff permissions for {staff.Email}.",
                $"Before: {before}. After: {after}.");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(staff));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("audit-logs")]
    public async Task<ActionResult<IReadOnlyList<AdminAuditLogResponse>>> GetAuditLogs(
        [FromQuery] string? search)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanViewAuditLogs(actor))
        {
            return Forbid();
        }

        var query = _context.AdminAuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim();

            query = query.Where(log =>
                log.ActorName.Contains(trimmedSearch) ||
                log.ActorEmail.Contains(trimmedSearch) ||
                log.ActorRole.Contains(trimmedSearch) ||
                (log.TargetEmail != null && log.TargetEmail.Contains(trimmedSearch)) ||
                log.Action.Contains(trimmedSearch) ||
                log.Summary.Contains(trimmedSearch) ||
                (log.Details != null && log.Details.Contains(trimmedSearch)));
        }

        var logs = await query
            .OrderByDescending(log => log.CreatedAt)
            .Take(300)
            .ToListAsync();

        return Ok(logs.Select(ToAuditLogResponse).ToList());
    }

    private async Task<User> CreateCustomerUserInternal(CreateAdminUserRequest request)
    {
        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        var generatedPassword = CreateServerGeneratedPassword();

        ValidateBasicUserFields(firstName, lastName, email, generatedPassword);

        var duplicate = await _context.Users
            .AsNoTracking()
            .AnyAsync(user => user.Email == email);

        if (duplicate)
        {
            throw new ValidationException("A user with this email already exists.");
        }

        var accountStatus = Canonicalise(request.AccountStatus, AllowedAccountStatuses);
        var subscriptionPlan = Canonicalise(request.SubscriptionPlan, AllowedSubscriptionPlans);
        var billingStatus = Canonicalise(request.BillingStatus, AllowedBillingStatuses);
        var healthStatus = Canonicalise(request.HealthStatus, AllowedHealthStatuses);

        if (string.Equals(subscriptionPlan, "Internal", StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Internal plan is only available for internal staff accounts.");
        }

        var now = DateTime.UtcNow;

        var user = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(generatedPassword),
            Role = "CustomerDirector",
            AccountStatus = accountStatus,
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            FreeMonthsExpireAt = request.FreeMonthsExpireAt,
            IsEmailVerified = false,
            PasswordResetRequired = true,
            BusinessName = CleanOptional(request.BusinessName),
            OwnerName = CleanOptional(request.OwnerName),
            OwnerPhone = CleanOptional(request.OwnerPhone),
            SubscriptionPlan = subscriptionPlan,
            BillingStatus = billingStatus,
            TrialEndsAt = request.TrialEndsAt,
            AdminTags = CleanOptional(request.AdminTags),
            SupportNotes = CleanOptional(request.SupportNotes),
            HealthStatus = healthStatus,
            AccountSource = CleanOptional(request.AccountSource),
            CancelReason = CleanOptional(request.CancelReason),
            AdminNotes = CleanOptional(request.AdminNotes),
            CreatedAt = now,
            UpdatedAt = now
        };

        if (string.IsNullOrWhiteSpace(user.BusinessName))
        {
            user.BusinessName = $"{firstName} {lastName}".Trim();
        }

        if (string.IsNullOrWhiteSpace(user.OwnerName))
        {
            user.OwnerName = $"{firstName} {lastName}".Trim();
        }

        if (user.TrialEndsAt is null && user.AccountStatus == "Trial")
        {
            user.TrialEndsAt = now.AddDays(14);
        }

        ValidateAccount(user);

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        return user;
    }

    private async Task<User> CreateStaffUserInternal(CreateStaffUserRequest request)
    {
        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.Equals(email, PermanentDirectorEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("The permanent Director account already exists.");
        }

        ValidateBasicUserFields(firstName, lastName, email, request.Password);

        var duplicate = await _context.Users
            .AsNoTracking()
            .AnyAsync(user => user.Email == email);

        if (duplicate)
        {
            throw new ValidationException("A user with this email already exists.");
        }

        var role = Canonicalise(request.Role, StaffRoles);

        var staff = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password.Trim()),
            Role = role,
            PersonalAssistantTo = role == "Personal Assistant"
                ? CleanOptional(request.PersonalAssistantTo)
                : null,
            AccountStatus = "Active",
            IsEmailVerified = true,
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            SubscriptionPlan = "Internal",
            BillingStatus = "Internal",
            HealthStatus = "Green",
            CanManageAccounts = request.CanManageAccounts,
            CanManageStaff = request.CanManageStaff,
            CanManageBilling = request.CanManageBilling,
            CanManageSecurity = request.CanManageSecurity,
            CanViewAuditLogs = request.CanViewAuditLogs,
            CanCreateCustomers = request.CanCreateCustomers,
            CanEditCustomers = request.CanEditCustomers,
            CanCancelCustomers = request.CanCancelCustomers,
            CanResetPasswords = request.CanResetPasswords,
            CanVerifyEmails = request.CanVerifyEmails,
            CanSendEmails = request.CanSendEmails,
            CanManageDiscounts = request.CanManageDiscounts,
            CanManageFreeMonths = request.CanManageFreeMonths,
            CanViewCustomerNotes = request.CanViewCustomerNotes,
            CanEditCustomerNotes = request.CanEditCustomerNotes,
            CanViewBilling = request.CanViewBilling,
            CanManageSubscriptions = request.CanManageSubscriptions,
            CanExportData = request.CanExportData,
            CanImpersonateCustomer = request.CanImpersonateCustomer,
            CanDeleteData = request.CanDeleteData,
            CanViewStaff = request.CanViewStaff,
            CanCreateStaff = request.CanCreateStaff,
            CanCancelStaff = request.CanCancelStaff,
            CanEditStaffPermissions = request.CanEditStaffPermissions,
            CanViewSecurityLogs = request.CanViewSecurityLogs,
            AdminNotes = CleanOptional(request.AdminNotes),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (staff.Role == "Director")
        {
            GiveDirectorPermissions(staff);
        }

        ValidateStaff(staff);

        await _context.Users.AddAsync(staff);
        await _context.SaveChangesAsync();

        return staff;
    }

    private static void ValidateBasicUserFields(
        string firstName,
        string lastName,
        string email,
        string password)
    {
        if (string.IsNullOrWhiteSpace(firstName))
        {
            throw new ValidationException("First name is required.");
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            throw new ValidationException("Last name is required.");
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            throw new ValidationException("A valid email address is required.");
        }

        if (string.IsNullOrWhiteSpace(password) || password.Trim().Length < 8)
        {
            throw new ValidationException("Password must be at least 8 characters.");
        }
    }

    private static void ValidateAccount(User user)
    {
        if (!AllowedAccountStatuses.Contains(user.AccountStatus, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Account status is invalid. Use Trial, Active, PastDue, Suspended, or Cancelled.");
        }

        if (!AllowedDiscountTypes.Contains(user.DiscountType, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Discount type is invalid. Use None, Amount, or Percentage.");
        }

        if (!AllowedSubscriptionPlans.Contains(user.SubscriptionPlan, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Subscription plan is invalid. Use Trial, Solo, Team, Business, Enterprise, or Internal.");
        }

        if (string.Equals(user.SubscriptionPlan, "Internal", StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Internal plan is only available for internal staff accounts.");
        }

        if (!AllowedBillingStatuses.Contains(user.BillingStatus, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Billing status is invalid. Use Trial, Active, PastDue, GracePeriod, Suspended, Cancelled, or Internal.");
        }

        if (!AllowedHealthStatuses.Contains(user.HealthStatus, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Health status is invalid. Use Green, Amber, or Red.");
        }

        if (user.DiscountValue < 0)
        {
            throw new ValidationException("Discount value cannot be negative.");
        }

        if (user.DiscountType == "None" && user.DiscountValue != 0)
        {
            throw new ValidationException("Discount value must be 0 when discount type is None.");
        }

        if (user.DiscountType == "Percentage" && user.DiscountValue > 100)
        {
            throw new ValidationException("Percentage discount cannot be more than 100%.");
        }

        if (user.FreeMonths < 0)
        {
            throw new ValidationException("Free months cannot be negative.");
        }

        if (user.FreeMonths > 24)
        {
            throw new ValidationException("Free months cannot be more than 24.");
        }

        if ((user.AccountStatus == "Cancelled" || user.BillingStatus == "Cancelled") &&
            string.IsNullOrWhiteSpace(user.CancelReason))
        {
            throw new ValidationException("Cancel reason is required when cancelling an account.");
        }

        ValidateMaxLength(user.BusinessName, 180, "Business name");
        ValidateMaxLength(user.OwnerName, 180, "Owner name");
        ValidateMaxLength(user.OwnerPhone, 40, "Owner phone");
        ValidateMaxLength(user.AdminTags, 500, "Admin tags");
        ValidateMaxLength(user.SupportNotes, 4000, "Support notes");
        ValidateMaxLength(user.AccountSource, 120, "Account source");
        ValidateMaxLength(user.CancelReason, 500, "Cancel reason");
        ValidateMaxLength(user.AdminNotes, 4000, "Admin notes");
    }

    private static void ValidateStaff(User staff)
    {
        if (!StaffRoles.Contains(staff.Role, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Staff role is invalid.");
        }

        if (!AllowedAccountStatuses.Contains(staff.AccountStatus, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Account status is invalid. Use Trial, Active, PastDue, Suspended, or Cancelled.");
        }

        if (staff.Role == "Personal Assistant" &&
            string.IsNullOrWhiteSpace(staff.PersonalAssistantTo))
        {
            throw new ValidationException("Personal Assistant accounts must say who they are PA to.");
        }

        ValidateMaxLength(staff.PersonalAssistantTo, 220, "PA to");
        ValidateMaxLength(staff.AdminNotes, 4000, "Admin notes");
    }

    private async Task<User?> FindCustomerAccountAsync(int id, bool asNoTracking = false)
    {
        var query = asNoTracking
            ? _context.Users.AsNoTracking()
            : _context.Users.AsQueryable();

        var user = await query.FirstOrDefaultAsync(existingUser => existingUser.Id == id);

        return user is not null && IsCustomerAccountUser(user) ? user : null;
    }

    private static bool IsCustomerAccountUser(User user)
    {
        return
            CustomerAccountRoles.Contains(user.Role, StringComparer.OrdinalIgnoreCase) ||
            (!StaffRoles.Contains(user.Role, StringComparer.OrdinalIgnoreCase) &&
                !string.Equals(user.SubscriptionPlan, "Internal", StringComparison.OrdinalIgnoreCase));
    }

    private static string CleanRequiredReason(string? value)
    {
        return CleanRequired(value, "Reason");
    }

    private static string CleanRequired(string? value, string label)
    {
        var cleaned = CleanOptional(value);

        if (string.IsNullOrWhiteSpace(cleaned))
        {
            throw new ValidationException($"{label} is required.");
        }

        return cleaned;
    }

    private static string CanonicaliseDiscountType(string value)
    {
        if (string.Equals(value, "FixedAmount", StringComparison.OrdinalIgnoreCase))
        {
            return "Amount";
        }

        return Canonicalise(value, AllowedDiscountTypes);
    }

    private static void ValidateSeats(string plan, int seatsPurchased)
    {
        switch (plan)
        {
            case "Solo" when seatsPurchased != 1:
                throw new ValidationException("Solo plan must have exactly 1 seat.");
            case "Team" when seatsPurchased < 2 || seatsPurchased > 10:
                throw new ValidationException("Team plan seats must be between 2 and 10.");
            case "Business" when seatsPurchased < 11 || seatsPurchased > 25:
                throw new ValidationException("Business plan seats must be between 11 and 25.");
            case "Enterprise" when seatsPurchased < 1:
                throw new ValidationException("Enterprise plan must have at least 1 seat.");
        }
    }

    private async Task UpsertSubscriptionAsync(
        User user,
        string planName,
        int seatsPurchased,
        string billingStatus)
    {
        var plan = await _context.Plans.FirstOrDefaultAsync(existingPlan => existingPlan.Name == planName);

        if (plan is null)
        {
            throw new ValidationException("Subscription plan is not configured.");
        }

        var subscription = await _context.Subscriptions
            .FirstOrDefaultAsync(existingSubscription => existingSubscription.TenantId == user.TenantId);

        if (subscription is null)
        {
            subscription = new Subscription
            {
                TenantId = user.TenantId,
                BillingStartUtc = DateTime.UtcNow,
                NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1)
            };

            await _context.Subscriptions.AddAsync(subscription);
        }

        subscription.PlanId = plan.Id;
        subscription.SeatsPurchased = seatsPurchased;
        subscription.Status = billingStatus;
    }

    private static string? MergeAdminNote(string? existing, string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return existing;
        }

        return string.IsNullOrWhiteSpace(existing)
            ? note
            : $"{existing.Trim()}\n{note}";
    }

    private static string? MergeTags(string? existingTags, IEnumerable<string> tags)
    {
        var merged = (existingTags ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Concat(tags)
            .Where(tag => !string.IsNullOrWhiteSpace(tag))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return merged.Length == 0 ? null : string.Join(", ", merged);
    }

    private static string AppendSupportNote(
        string? existing,
        User actor,
        string note,
        IReadOnlyCollection<string> tags)
    {
        var author = $"{actor.FirstName} {actor.LastName}".Trim();
        var stamp = DateTime.UtcNow.ToString("u");
        var tagText = tags.Count == 0 ? string.Empty : $" Tags: {string.Join(", ", tags)}.";
        var entry = $"[{stamp}] {author}: {note}{tagText}";

        return string.IsNullOrWhiteSpace(existing)
            ? entry
            : $"{entry}\n\n{existing.Trim()}";
    }

    private async Task<User?> GetCurrentStaffUserAsync()
    {
        var email =
            User.FindFirstValue(JwtRegisteredClaimNames.Email) ??
            User.FindFirstValue(ClaimTypes.Email) ??
            string.Empty;

        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(existingUser => existingUser.Email == email);

        if (user is null || !StaffRoles.Contains(user.Role))
        {
            return null;
        }

        if (user.AccountStatus is "Suspended" or "Cancelled" or "InvitePending")
        {
            return null;
        }

        return user;
    }

    private async Task LogAsync(
        User actor,
        string action,
        string targetType,
        int? targetId,
        string? targetEmail,
        string summary,
        string? details)
    {
        await _context.AdminAuditLogs.AddAsync(new AdminAuditLog
        {
            ActorUserId = actor.Id,
            ActorEmail = actor.Email,
            ActorName = $"{actor.FirstName} {actor.LastName}".Trim(),
            ActorRole = actor.Role,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            TargetEmail = targetEmail,
            Summary = summary,
            Details = details,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            CreatedAt = DateTime.UtcNow
        });
    }

    private static bool IsPermanentDirector(User user)
    {
        return string.Equals(
            user.Email,
            PermanentDirectorEmail,
            StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDirector(User user)
    {
        return string.Equals(user.Role, "Director", StringComparison.OrdinalIgnoreCase);
    }

    private static bool CanManageAccounts(User user)
    {
        return IsDirector(user) || user.CanManageAccounts;
    }

    private static bool CanManageStaff(User user)
    {
        return IsDirector(user) || user.CanManageStaff;
    }

    private static bool CanManageBilling(User user)
    {
        return IsDirector(user) || user.CanManageBilling;
    }

    private static bool CanManageSecurity(User user)
    {
        return IsDirector(user) || user.CanManageSecurity;
    }

    private static bool CanSeeCustomerAccounts(User user)
    {
        return
            CanManageAccounts(user) ||
            CanCreateCustomers(user) ||
            CanEditCustomers(user) ||
            CanCancelCustomers(user) ||
            CanViewBilling(user) ||
            CanViewCustomerNotes(user);
    }

    private static bool CanCreateCustomers(User user)
    {
        return IsDirector(user) || user.CanCreateCustomers || user.CanManageAccounts;
    }

    private static bool CanEditCustomers(User user)
    {
        return IsDirector(user) || user.CanEditCustomers || user.CanManageAccounts;
    }

    private static bool CanCancelCustomers(User user)
    {
        return IsDirector(user) || user.CanCancelCustomers || user.CanManageAccounts;
    }

    private static bool CanResetPasswords(User user)
    {
        return IsDirector(user) || user.CanResetPasswords || user.CanManageSecurity;
    }

    private static string CreateServerGeneratedPassword()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    private static bool CanVerifyEmails(User user)
    {
        return IsDirector(user) || user.CanVerifyEmails || user.CanManageSecurity;
    }

    private static bool CanSendEmails(User user)
    {
        return IsDirector(user) || user.CanSendEmails || user.CanManageSecurity;
    }

    private static bool CanManageDiscounts(User user)
    {
        return IsDirector(user) || user.CanManageDiscounts || user.CanManageBilling;
    }

    private static bool CanManageFreeMonths(User user)
    {
        return IsDirector(user) || user.CanManageFreeMonths || user.CanManageBilling;
    }

    private static bool CanViewCustomerNotes(User user)
    {
        return IsDirector(user) || user.CanViewCustomerNotes || user.CanManageAccounts;
    }

    private static bool CanEditCustomerNotes(User user)
    {
        return IsDirector(user) || user.CanEditCustomerNotes || user.CanManageAccounts;
    }

    private static bool CanViewBilling(User user)
    {
        return IsDirector(user) || user.CanViewBilling || user.CanManageBilling;
    }

    private static bool CanManageSubscriptions(User user)
    {
        return IsDirector(user) || user.CanManageSubscriptions || user.CanManageBilling;
    }

    private static bool CanViewStaff(User user)
    {
        return IsDirector(user) || user.CanViewStaff || CanManageStaff(user);
    }

    private static bool CanCreateStaff(User user)
    {
        return IsDirector(user) || user.CanCreateStaff || CanManageStaff(user);
    }

    private static bool CanCancelStaff(User user)
    {
        return IsDirector(user) || user.CanCancelStaff || CanManageStaff(user);
    }

    private static bool CanEditStaffPermissions(User user)
    {
        return IsDirector(user) || user.CanEditStaffPermissions || CanManageStaff(user);
    }

    private static bool CanViewAuditLogs(User user)
    {
        return IsDirector(user) || user.CanViewAuditLogs;
    }

    private static void GiveDirectorPermissions(User user)
    {
        user.CanManageAccounts = true;
        user.CanManageStaff = true;
        user.CanManageBilling = true;
        user.CanManageSecurity = true;
        user.CanViewAuditLogs = true;
        user.CanCreateCustomers = true;
        user.CanEditCustomers = true;
        user.CanCancelCustomers = true;
        user.CanResetPasswords = true;
        user.CanVerifyEmails = true;
        user.CanSendEmails = true;
        user.CanManageDiscounts = true;
        user.CanManageFreeMonths = true;
        user.CanViewCustomerNotes = true;
        user.CanEditCustomerNotes = true;
        user.CanViewBilling = true;
        user.CanManageSubscriptions = true;
        user.CanExportData = true;
        user.CanImpersonateCustomer = true;
        user.CanDeleteData = true;
        user.CanViewStaff = true;
        user.CanCreateStaff = true;
        user.CanCancelStaff = true;
        user.CanEditStaffPermissions = true;
        user.CanViewSecurityLogs = true;
    }

    private static string BuildPermissionDetails(User user)
    {
        return
            $"Role={user.Role}; PAto={user.PersonalAssistantTo}; Status={user.AccountStatus}; " +
            $"ManageAccounts={user.CanManageAccounts}; ManageStaff={user.CanManageStaff}; ManageBilling={user.CanManageBilling}; ManageSecurity={user.CanManageSecurity}; ViewAuditLogs={user.CanViewAuditLogs}; " +
            $"CreateCustomers={user.CanCreateCustomers}; EditCustomers={user.CanEditCustomers}; CancelCustomers={user.CanCancelCustomers}; " +
            $"ResetPasswords={user.CanResetPasswords}; VerifyEmails={user.CanVerifyEmails}; SendEmails={user.CanSendEmails}; " +
            $"ManageDiscounts={user.CanManageDiscounts}; ManageFreeMonths={user.CanManageFreeMonths}; " +
            $"ViewCustomerNotes={user.CanViewCustomerNotes}; EditCustomerNotes={user.CanEditCustomerNotes}; " +
            $"ViewBilling={user.CanViewBilling}; ManageSubscriptions={user.CanManageSubscriptions}; ExportData={user.CanExportData}; " +
            $"ImpersonateCustomer={user.CanImpersonateCustomer}; DeleteData={user.CanDeleteData}; " +
            $"ViewStaff={user.CanViewStaff}; CreateStaff={user.CanCreateStaff}; CancelStaff={user.CanCancelStaff}; EditStaffPermissions={user.CanEditStaffPermissions}; ViewSecurityLogs={user.CanViewSecurityLogs}";
    }

    private static string BuildCustomerDetails(User user)
    {
        return
            $"Status={user.AccountStatus}; BillingStatus={user.BillingStatus}; Plan={user.SubscriptionPlan}; " +
            $"Discount={user.DiscountType}:{user.DiscountValue}; FreeMonths={user.FreeMonths}; FreeMonthsExpireAt={user.FreeMonthsExpireAt}; " +
            $"TrialEndsAt={user.TrialEndsAt}; Health={user.HealthStatus}; Source={user.AccountSource}; Tags={user.AdminTags}; CancelReason={user.CancelReason}";
    }

    private static AdminUserResponse ToResponse(User user)
    {
        return new AdminUserResponse
        {
            Id = user.Id,
            TenantId = user.TenantId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = $"{user.FirstName} {user.LastName}".Trim(),
            Email = user.Email,
            Role = user.Role,
            PersonalAssistantTo = user.PersonalAssistantTo,
            AccountStatus = user.AccountStatus,
            IsEmailVerified = user.IsEmailVerified,
            EmailVerificationSentAt = user.EmailVerificationSentAt,
            DiscountType = user.DiscountType,
            DiscountValue = user.DiscountValue,
            FreeMonths = user.FreeMonths,
            FreeMonthsExpireAt = user.FreeMonthsExpireAt,
            PasswordResetRequired = user.PasswordResetRequired,
            BusinessName = user.BusinessName,
            OwnerName = user.OwnerName,
            OwnerPhone = user.OwnerPhone,
            SubscriptionPlan = user.SubscriptionPlan,
            BillingStatus = user.BillingStatus,
            TrialEndsAt = user.TrialEndsAt,
            AdminTags = user.AdminTags,
            SupportNotes = user.SupportNotes,
            HealthStatus = user.HealthStatus,
            LastLoginAt = user.LastLoginAt,
            AccountSource = user.AccountSource,
            CancelReason = user.CancelReason,
            OnboardingEmailSentAt = user.OnboardingEmailSentAt,
            CanManageAccounts = user.CanManageAccounts,
            CanManageStaff = user.CanManageStaff,
            CanManageBilling = user.CanManageBilling,
            CanManageSecurity = user.CanManageSecurity,
            CanViewAuditLogs = user.CanViewAuditLogs,
            CanCreateCustomers = user.CanCreateCustomers,
            CanEditCustomers = user.CanEditCustomers,
            CanCancelCustomers = user.CanCancelCustomers,
            CanResetPasswords = user.CanResetPasswords,
            CanVerifyEmails = user.CanVerifyEmails,
            CanSendEmails = user.CanSendEmails,
            CanManageDiscounts = user.CanManageDiscounts,
            CanManageFreeMonths = user.CanManageFreeMonths,
            CanViewCustomerNotes = user.CanViewCustomerNotes,
            CanEditCustomerNotes = user.CanEditCustomerNotes,
            CanViewBilling = user.CanViewBilling,
            CanManageSubscriptions = user.CanManageSubscriptions,
            CanExportData = user.CanExportData,
            CanImpersonateCustomer = user.CanImpersonateCustomer,
            CanDeleteData = user.CanDeleteData,
            CanViewStaff = user.CanViewStaff,
            CanCreateStaff = user.CanCreateStaff,
            CanCancelStaff = user.CanCancelStaff,
            CanEditStaffPermissions = user.CanEditStaffPermissions,
            CanViewSecurityLogs = user.CanViewSecurityLogs,
            AdminNotes = user.AdminNotes,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    private static AdminAuditLogResponse ToAuditLogResponse(AdminAuditLog log)
    {
        return new AdminAuditLogResponse
        {
            Id = log.Id,
            ActorUserId = log.ActorUserId,
            ActorEmail = log.ActorEmail,
            ActorName = log.ActorName,
            ActorRole = log.ActorRole,
            Action = log.Action,
            TargetType = log.TargetType,
            TargetId = log.TargetId,
            TargetEmail = log.TargetEmail,
            Summary = log.Summary,
            Details = log.Details,
            IpAddress = log.IpAddress,
            UserAgent = log.UserAgent,
            CreatedAt = log.CreatedAt
        };
    }

    private static string Canonicalise(string value, IReadOnlyCollection<string> allowedValues)
    {
        var trimmed = string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

        return allowedValues.FirstOrDefault(
            allowed => string.Equals(allowed, trimmed, StringComparison.OrdinalIgnoreCase))
            ?? trimmed;
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static void ValidateMaxLength(string? value, int maxLength, string fieldName)
    {
        if (!string.IsNullOrWhiteSpace(value) && value.Length > maxLength)
        {
            throw new ValidationException($"{fieldName} must be {maxLength} characters or fewer.");
        }
    }

    private static decimal RoundMoney(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}
