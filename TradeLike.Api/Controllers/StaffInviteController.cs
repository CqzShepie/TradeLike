using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/staff")]
public class StaffInviteController : ControllerBase
{
    private const string PermanentDirectorEmail = "admin@tradelike.co.uk";
    private const int InviteExpiryDays = 7;

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

    private readonly TradeLikeDbContext _context;

    public StaffInviteController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpPost("invite")]
    public async Task<ActionResult<object>> InviteStaff([FromBody] CreateStaffUserRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null || !CanCreateStaff(actor))
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
            var staff = await CreateInvitedStaffAsync(request);

            await LogAsync(
                actor,
                "StaffInviteSent",
                "User",
                staff.Id,
                staff.Email,
                $"Sent staff invite to {staff.Email}.",
                $"Role={staff.Role}; Invite expires {staff.EmailVerificationSentAt?.AddDays(InviteExpiryDays):u}. Real email sending will be wired when the email provider is added.");

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Staff invite recorded. Real email sending will be wired when the email provider is added.",
                inviteExpiresAt = staff.EmailVerificationSentAt?.AddDays(InviteExpiryDays),
                user = ToResponse(staff)
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/resend-invite")]
    public async Task<ActionResult<object>> ResendInvite(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null || !CanCreateStaff(actor))
        {
            return Forbid();
        }

        var staff = await _context.Users.FindAsync(id);

        if (staff is null || !StaffRoles.Contains(staff.Role))
        {
            return NotFound();
        }

        if (IsPermanentDirector(staff) && !IsPermanentDirector(actor))
        {
            return Forbid();
        }

        if (staff.AccountStatus == "Cancelled")
        {
            return BadRequest(new { error = "Cancelled staff cannot be invited again. Reactivate or create a new staff account." });
        }

        staff.AccountStatus = "InvitePending";
        staff.IsEmailVerified = false;
        staff.PasswordResetRequired = true;
        staff.EmailVerificationSentAt = DateTime.UtcNow;
        staff.UpdatedAt = DateTime.UtcNow;

        await LogAsync(
            actor,
            "StaffInviteResent",
            "User",
            staff.Id,
            staff.Email,
            $"Resent staff invite to {staff.Email}.",
            $"Invite expires {staff.EmailVerificationSentAt?.AddDays(InviteExpiryDays):u}. Real email sending will be wired when the email provider is added.");

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Staff invite resend recorded. Real email sending will be wired when the email provider is added.",
            inviteExpiresAt = staff.EmailVerificationSentAt?.AddDays(InviteExpiryDays),
            user = ToResponse(staff)
        });
    }

    [HttpPost("{id:int}/force-password-reset")]
    public async Task<ActionResult<AdminUserResponse>> ForcePasswordReset(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null || !CanEditStaffPermissions(actor))
        {
            return Forbid();
        }

        var staff = await _context.Users.FindAsync(id);

        if (staff is null || !StaffRoles.Contains(staff.Role))
        {
            return NotFound();
        }

        if (IsPermanentDirector(staff) && !IsPermanentDirector(actor))
        {
            return Forbid();
        }

        staff.PasswordResetRequired = true;
        staff.UpdatedAt = DateTime.UtcNow;

        await LogAsync(
            actor,
            "StaffPasswordResetForced",
            "User",
            staff.Id,
            staff.Email,
            $"Forced password reset for {staff.Email}.",
            null);

        await _context.SaveChangesAsync();

        return Ok(ToResponse(staff));
    }

    [HttpPost("{id:int}/mark-invite-accepted")]
    public async Task<ActionResult<AdminUserResponse>> MarkInviteAccepted(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null || !CanEditStaffPermissions(actor))
        {
            return Forbid();
        }

        var staff = await _context.Users.FindAsync(id);

        if (staff is null || !StaffRoles.Contains(staff.Role))
        {
            return NotFound();
        }

        if (IsPermanentDirector(staff) && !IsPermanentDirector(actor))
        {
            return Forbid();
        }

        staff.AccountStatus = "Active";
        staff.IsEmailVerified = true;
        staff.PasswordResetRequired = false;
        staff.UpdatedAt = DateTime.UtcNow;

        await LogAsync(
            actor,
            "StaffInviteAcceptedManually",
            "User",
            staff.Id,
            staff.Email,
            $"Marked staff invite accepted for {staff.Email}.",
            null);

        await _context.SaveChangesAsync();

        return Ok(ToResponse(staff));
    }

    private async Task<User> CreateInvitedStaffAsync(CreateStaffUserRequest request)
    {
        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        var role = Canonicalise(request.Role, StaffRoles);

        ValidateBasicStaffFields(firstName, lastName, email, role, request.PersonalAssistantTo);

        if (string.Equals(email, PermanentDirectorEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("The permanent Director account already exists.");
        }

        var duplicate = await _context.Users
            .AsNoTracking()
            .AnyAsync(user => user.Email == email);

        if (duplicate)
        {
            throw new ValidationException("A user with this email already exists.");
        }

        var now = DateTime.UtcNow;
        var temporaryPassword = $"Invite-{Guid.NewGuid():N}!";

        var staff = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword),
            Role = role,
            PersonalAssistantTo = role == "Personal Assistant"
                ? CleanOptional(request.PersonalAssistantTo)
                : null,
            AccountStatus = "InvitePending",
            IsEmailVerified = false,
            EmailVerificationSentAt = now,
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            PasswordResetRequired = true,
            SubscriptionPlan = "Internal",
            BillingStatus = "Internal",
            HealthStatus = "Green",
            AccountSource = "Staff Invite",
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
            CreatedAt = now,
            UpdatedAt = now
        };

        if (staff.Role == "Director")
        {
            GiveDirectorPermissions(staff);
            staff.AccountStatus = "Active";
            staff.IsEmailVerified = true;
            staff.PasswordResetRequired = false;
        }

        await _context.Users.AddAsync(staff);
        await _context.SaveChangesAsync();

        return staff;
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

    private static void ValidateBasicStaffFields(
        string firstName,
        string lastName,
        string email,
        string role,
        string personalAssistantTo)
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

        if (!StaffRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Staff role is invalid.");
        }

        if (role == "Personal Assistant" && string.IsNullOrWhiteSpace(personalAssistantTo))
        {
            throw new ValidationException("Personal Assistant accounts must say who they are PA to.");
        }
    }

    private static bool IsPermanentDirector(User user)
    {
        return string.Equals(user.Email, PermanentDirectorEmail, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDirector(User user)
    {
        return string.Equals(user.Role, "Director", StringComparison.OrdinalIgnoreCase);
    }

    private static bool CanManageStaff(User user)
    {
        return IsDirector(user) || user.CanManageStaff;
    }

    private static bool CanCreateStaff(User user)
    {
        return IsDirector(user) || user.CanCreateStaff || CanManageStaff(user);
    }

    private static bool CanEditStaffPermissions(User user)
    {
        return IsDirector(user) || user.CanEditStaffPermissions || CanManageStaff(user);
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

    private static AdminUserResponse ToResponse(User user)
    {
        return new AdminUserResponse
        {
            Id = user.Id,
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

    private static string Canonicalise(string value, IReadOnlyCollection<string> allowedValues)
    {
        var trimmed = string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

        return allowedValues.FirstOrDefault(
            allowed => string.Equals(allowed, trimmed, StringComparison.OrdinalIgnoreCase))
            ?? trimmed;
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
