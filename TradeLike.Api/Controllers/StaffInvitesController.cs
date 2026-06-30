using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/admin/staff")]
public class StaffInvitesController : ControllerBase
{
    private const string PermanentDirectorEmail = "admin@tradelike.co.uk";
    private const int InviteDays = 7;

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

    public StaffInvitesController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [Authorize]
    [HttpPost("invite")]
    public async Task<ActionResult<object>> InviteStaff([FromBody] CreateStaffUserRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null || !CanSendStaffInvites(actor))
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
            var invite = GenerateInvite();
            var staff = await CreatePendingStaffAsync(request, actor, invite.Hash);
            var inviteLink = BuildInviteLink(invite.Token);

            await LogAsync(
                actor,
                "StaffInviteSent",
                "User",
                staff.Id,
                staff.Email,
                $"Sent staff invite to {staff.Email}.",
                $"Role={staff.Role}; ExpiresAt={staff.TrialEndsAt:u}");

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Staff invite created for {staff.Email}. Copy this invite link and send it to them: {inviteLink}",
                inviteLink,
                inviteExpiresAt = staff.TrialEndsAt,
                user = ToResponse(staff)
            });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("{id:int}/resend-invite")]
    public async Task<ActionResult<object>> ResendInvite(int id)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null || !CanSendStaffInvites(actor))
        {
            return Forbid();
        }

        var staff = await _context.Users.FindAsync(id);

        if (staff is null || !StaffRoles.Contains(staff.Role))
        {
            return NotFound();
        }

        if (staff.AccountStatus != "InvitePending")
        {
            return BadRequest(new { error = "Only pending staff invites can be resent." });
        }

        var invite = GenerateInvite();
        var now = DateTime.UtcNow;

        staff.AdminTags = StoreInviteHash(staff.AdminTags, invite.Hash);
        staff.TrialEndsAt = now.AddDays(InviteDays);
        staff.EmailVerificationSentAt = now;
        staff.UpdatedAt = now;

        var inviteLink = BuildInviteLink(invite.Token);

        await LogAsync(
            actor,
            "StaffInviteResent",
            "User",
            staff.Id,
            staff.Email,
            $"Resent staff invite to {staff.Email}.",
            $"ExpiresAt={staff.TrialEndsAt:u}");

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Staff invite resent for {staff.Email}. Copy this invite link and send it to them: {inviteLink}",
            inviteLink,
            inviteExpiresAt = staff.TrialEndsAt,
            user = ToResponse(staff)
        });
    }

    [AllowAnonymous]
    [HttpGet("invite-preview")]
    public async Task<ActionResult<object>> InvitePreview([FromQuery] string token)
    {
        var staff = await FindPendingInviteAsync(token);

        if (staff is null)
        {
            return NotFound(new { error = "This invite is invalid or expired." });
        }

        return Ok(new
        {
            firstName = staff.FirstName,
            lastName = staff.LastName,
            email = staff.Email,
            role = staff.Role,
            personalAssistantTo = staff.PersonalAssistantTo,
            inviteExpiresAt = staff.TrialEndsAt
        });
    }

    [AllowAnonymous]
    [HttpPost("accept-invite")]
    public async Task<ActionResult<object>> AcceptInvite([FromBody] AcceptStaffInviteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Trim().Length < 8)
        {
            return BadRequest(new { error = "Password must be at least 8 characters." });
        }

        var staff = await FindPendingInviteAsync(request.Token);

        if (staff is null)
        {
            return NotFound(new { error = "This invite is invalid or expired." });
        }

        staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password.Trim());
        staff.AccountStatus = "Active";
        staff.IsEmailVerified = true;
        staff.PasswordResetRequired = false;
        staff.TrialEndsAt = null;
        staff.AdminTags = RemoveInviteHash(staff.AdminTags);
        staff.UpdatedAt = DateTime.UtcNow;

        await _context.AdminAuditLogs.AddAsync(new AdminAuditLog
        {
            ActorUserId = staff.Id,
            ActorEmail = staff.Email,
            ActorName = $"{staff.FirstName} {staff.LastName}".Trim(),
            ActorRole = staff.Role,
            Action = "StaffInviteAccepted",
            TargetType = "User",
            TargetId = staff.Id,
            TargetEmail = staff.Email,
            Summary = $"Staff invite accepted by {staff.Email}.",
            Details = "Staff member set their own password and activated the account.",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = "Invite accepted. You can now sign in." });
    }

    private async Task<User> CreatePendingStaffAsync(CreateStaffUserRequest request, User actor, string inviteHash)
    {
        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

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

        if (string.Equals(email, PermanentDirectorEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("The permanent Director account already exists.");
        }

        var duplicate = await _context.Users.AsNoTracking().AnyAsync(user => user.Email == email);

        if (duplicate)
        {
            throw new ValidationException("A user with this email already exists.");
        }

        var role = StaffRoles.FirstOrDefault(allowed => string.Equals(allowed, request.Role.Trim(), StringComparison.OrdinalIgnoreCase)) ?? request.Role.Trim();

        if (!StaffRoles.Contains(role))
        {
            throw new ValidationException("Staff role is invalid.");
        }

        if (role == "Personal Assistant" && string.IsNullOrWhiteSpace(request.PersonalAssistantTo))
        {
            throw new ValidationException("Personal Assistant accounts must say who they are PA to.");
        }

        var now = DateTime.UtcNow;

        var staff = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
            Role = role,
            PersonalAssistantTo = role == "Personal Assistant" ? CleanOptional(request.PersonalAssistantTo) : null,
            AccountStatus = "InvitePending",
            IsEmailVerified = false,
            EmailVerificationSentAt = now,
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            PasswordResetRequired = true,
            SubscriptionPlan = "Internal",
            BillingStatus = "Internal",
            TrialEndsAt = now.AddDays(InviteDays),
            AdminTags = StoreInviteHash(null, inviteHash),
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
        }

        await _context.Users.AddAsync(staff);
        await _context.SaveChangesAsync();

        return staff;
    }

    private async Task<User?> FindPendingInviteAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var pendingStaff = await _context.Users
            .Where(user => user.AccountStatus == "InvitePending" && user.TrialEndsAt != null && user.TrialEndsAt > now)
            .ToListAsync();

        return pendingStaff.FirstOrDefault(staff =>
        {
            var hash = ReadInviteHash(staff.AdminTags);
            return hash is not null && BCrypt.Net.BCrypt.Verify(token.Trim(), hash);
        });
    }

    private (string Token, string Hash) GenerateInvite()
    {
        var token = $"{Guid.NewGuid():N}{Guid.NewGuid():N}";
        return (token, BCrypt.Net.BCrypt.HashPassword(token));
    }

    private string BuildInviteLink(string token)
    {
        var origin = Request.Headers.Origin.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(origin))
        {
            origin = "http://localhost:5173";
        }

        return $"{origin.TrimEnd('/')}/accept-staff-invite?token={Uri.EscapeDataString(token)}";
    }

    private static string StoreInviteHash(string? existingTags, string inviteHash)
    {
        var cleaned = RemoveInviteHash(existingTags);
        return string.IsNullOrWhiteSpace(cleaned)
            ? $"InviteHash:{inviteHash}"
            : $"{cleaned}, InviteHash:{inviteHash}";
    }

    private static string? ReadInviteHash(string? tags)
    {
        if (string.IsNullOrWhiteSpace(tags))
        {
            return null;
        }

        var marker = "InviteHash:";
        var start = tags.IndexOf(marker, StringComparison.OrdinalIgnoreCase);

        if (start < 0)
        {
            return null;
        }

        var hashStart = start + marker.Length;
        var hashEnd = tags.IndexOf(',', hashStart);

        return hashEnd < 0
            ? tags[hashStart..].Trim()
            : tags[hashStart..hashEnd].Trim();
    }

    private static string? RemoveInviteHash(string? tags)
    {
        if (string.IsNullOrWhiteSpace(tags))
        {
            return null;
        }

        var parts = tags
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(part => !part.StartsWith("InviteHash:", StringComparison.OrdinalIgnoreCase))
            .ToList();

        return parts.Count == 0 ? null : string.Join(", ", parts);
    }

    private async Task<User?> GetCurrentStaffUserAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var user = await _context.Users.FirstOrDefaultAsync(existingUser => existingUser.Email == email);

        if (user is null || !StaffRoles.Contains(user.Role) || user.AccountStatus is "Suspended" or "Cancelled" or "InvitePending")
        {
            return null;
        }

        return user;
    }

    private static bool IsPermanentDirector(User user)
    {
        return string.Equals(user.Email, PermanentDirectorEmail, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDirector(User user)
    {
        return string.Equals(user.Role, "Director", StringComparison.OrdinalIgnoreCase);
    }

    private static bool CanSendStaffInvites(User user)
    {
        return IsDirector(user) || user.CanCreateStaff || user.CanManageStaff;
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

    private async Task LogAsync(User actor, string action, string targetType, int? targetId, string? targetEmail, string summary, string? details)
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
}

public sealed class AcceptStaffInviteRequest
{
    public string Token { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;
}
