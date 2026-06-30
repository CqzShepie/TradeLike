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
[Route("api/admin")]
public class AdminUserController : ControllerBase
{
    private const string PermanentDirectorEmail = "admin@tradelike.co.uk";

    private static readonly string[] StaffRoles =
    {
        "Director",
        "Admin",
        "Support"
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

    private readonly TradeLikeDbContext _context;

    public AdminUserController(TradeLikeDbContext context)
    {
        _context = context;
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

        if (!CanManageAccounts(actor) && !CanManageBilling(actor) && !CanManageSecurity(actor))
        {
            return Forbid();
        }

        var query = _context.Users
            .AsNoTracking()
            .Where(user => user.Role == "Customer");

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim();

            query = query.Where(user =>
                user.FirstName.Contains(trimmedSearch) ||
                user.LastName.Contains(trimmedSearch) ||
                user.Email.Contains(trimmedSearch) ||
                user.AccountStatus.Contains(trimmedSearch));
        }

        var users = await query
            .OrderByDescending(user => user.CreatedAt)
            .Take(200)
            .ToListAsync();

        return Ok(users.Select(ToResponse).ToList());
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

        if (!CanManageAccounts(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await CreateCustomerUserInternal(request);

            await LogAsync(
                actor,
                "CustomerAccountCreated",
                "User",
                user.Id,
                user.Email,
                $"Created customer account for {user.Email}.",
                $"Status: {user.AccountStatus}");

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetUsers),
                new { id = user.Id },
                ToResponse(user));
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

        if (!CanManageAccounts(actor) && !CanManageBilling(actor))
        {
            return Forbid();
        }

        try
        {
            var user = await _context.Users.FindAsync(id);

            if (user is null || user.Role != "Customer")
            {
                return NotFound();
            }

            var before =
                $"Status={user.AccountStatus}; Discount={user.DiscountType}:{user.DiscountValue}; FreeMonths={user.FreeMonths}";

            user.AccountStatus = Canonicalise(request.AccountStatus, AllowedAccountStatuses);
            user.DiscountType = Canonicalise(request.DiscountType, AllowedDiscountTypes);
            user.DiscountValue = RoundMoney(request.DiscountValue);
            user.FreeMonths = request.FreeMonths;
            user.AdminNotes = string.IsNullOrWhiteSpace(request.AdminNotes)
                ? null
                : request.AdminNotes.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            ValidateAccount(user);

            var after =
                $"Status={user.AccountStatus}; Discount={user.DiscountType}:{user.DiscountValue}; FreeMonths={user.FreeMonths}";

            await LogAsync(
                actor,
                "CustomerAccountUpdated",
                "User",
                user.Id,
                user.Email,
                $"Updated customer account for {user.Email}.",
                $"Before: {before}. After: {after}.");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("users/{id:int}/reset-password")]
    public async Task<ActionResult<AdminUserResponse>> ResetPassword(
        int id,
        [FromBody] ResetAdminUserPasswordRequest request)
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanManageSecurity(actor))
        {
            return Forbid();
        }

        try
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) ||
                request.NewPassword.Length < 8)
            {
                throw new ValidationException("New password must be at least 8 characters.");
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

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordResetRequired = request.RequirePasswordReset;
            user.UpdatedAt = DateTime.UtcNow;

            await LogAsync(
                actor,
                "PasswordReset",
                "User",
                user.Id,
                user.Email,
                $"Reset password for {user.Email}.",
                $"Require password reset on next login: {request.RequirePasswordReset}");

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
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

        if (!CanManageSecurity(actor))
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

        if (!CanManageSecurity(actor))
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

    [HttpGet("staff")]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> GetStaff()
    {
        var actor = await GetCurrentStaffUserAsync();

        if (actor is null)
        {
            return Forbid();
        }

        if (!CanManageStaff(actor))
        {
            return Forbid();
        }

        var staff = await _context.Users
            .AsNoTracking()
            .Where(user => StaffRoles.Contains(user.Role))
            .OrderBy(user => user.Role == "Director" ? 0 : 1)
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

        if (!IsDirector(actor))
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

        if (!IsDirector(actor))
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
                    AccountStatus = "Active",
                    CanManageAccounts = true,
                    CanManageStaff = true,
                    CanManageBilling = true,
                    CanManageSecurity = true,
                    CanViewAuditLogs = true,
                    AdminNotes = request.AdminNotes
                };
            }

            if (staff.Id == actor.Id &&
                !string.Equals(request.Role, "Director", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("You cannot remove your own Director role.");
            }

            var before = BuildPermissionDetails(staff);

            staff.Role = Canonicalise(request.Role, StaffRoles);
            staff.AccountStatus = Canonicalise(request.AccountStatus, AllowedAccountStatuses);
            staff.CanManageAccounts = request.CanManageAccounts;
            staff.CanManageStaff = request.CanManageStaff;
            staff.CanManageBilling = request.CanManageBilling;
            staff.CanManageSecurity = request.CanManageSecurity;
            staff.CanViewAuditLogs = request.CanViewAuditLogs;
            staff.AdminNotes = string.IsNullOrWhiteSpace(request.AdminNotes)
                ? null
                : request.AdminNotes.Trim();
            staff.UpdatedAt = DateTime.UtcNow;

            if (staff.Role == "Director" || IsPermanentDirector(staff))
            {
                GiveDirectorPermissions(staff);
                staff.Role = "Director";
                staff.AccountStatus = "Active";
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
                log.ActorEmail.Contains(trimmedSearch) ||
                (log.TargetEmail != null && log.TargetEmail.Contains(trimmedSearch)) ||
                log.Action.Contains(trimmedSearch) ||
                log.Summary.Contains(trimmedSearch));
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

        ValidateBasicUserFields(firstName, lastName, email, request.Password);

        var duplicate = await _context.Users
            .AsNoTracking()
            .AnyAsync(user => user.Email == email);

        if (duplicate)
        {
            throw new ValidationException("A user with this email already exists.");
        }

        var user = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = "Customer",
            AccountStatus = Canonicalise(request.AccountStatus, AllowedAccountStatuses),
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            IsEmailVerified = false,
            PasswordResetRequired = false,
            AdminNotes = string.IsNullOrWhiteSpace(request.AdminNotes)
                ? null
                : request.AdminNotes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

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

        var staff = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = Canonicalise(request.Role, StaffRoles),
            AccountStatus = "Active",
            IsEmailVerified = true,
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            CanManageAccounts = request.CanManageAccounts,
            CanManageStaff = request.CanManageStaff,
            CanManageBilling = request.CanManageBilling,
            CanManageSecurity = request.CanManageSecurity,
            CanViewAuditLogs = request.CanViewAuditLogs,
            AdminNotes = string.IsNullOrWhiteSpace(request.AdminNotes)
                ? null
                : request.AdminNotes.Trim(),
            CreatedAt = DateTime.UtcNow
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

        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
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

        if (user.FreeMonths > 120)
        {
            throw new ValidationException("Free months cannot be more than 120.");
        }

        if (!string.IsNullOrWhiteSpace(user.AdminNotes) &&
            user.AdminNotes.Length > 4000)
        {
            throw new ValidationException("Admin notes must be 4000 characters or fewer.");
        }
    }

    private static void ValidateStaff(User staff)
    {
        if (!StaffRoles.Contains(staff.Role, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Staff role is invalid. Use Director, Admin, or Support.");
        }

        if (!AllowedAccountStatuses.Contains(staff.AccountStatus, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Account status is invalid. Use Trial, Active, PastDue, Suspended, or Cancelled.");
        }

        if (!string.IsNullOrWhiteSpace(staff.AdminNotes) &&
            staff.AdminNotes.Length > 4000)
        {
            throw new ValidationException("Admin notes must be 4000 characters or fewer.");
        }
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

        if (user.AccountStatus is "Suspended" or "Cancelled")
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
    }

    private static string BuildPermissionDetails(User user)
    {
        return
            $"Role={user.Role}; Status={user.AccountStatus}; " +
            $"Accounts={user.CanManageAccounts}; Staff={user.CanManageStaff}; " +
            $"Billing={user.CanManageBilling}; Security={user.CanManageSecurity}; " +
            $"AuditLogs={user.CanViewAuditLogs}";
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
            AccountStatus = user.AccountStatus,
            IsEmailVerified = user.IsEmailVerified,
            EmailVerificationSentAt = user.EmailVerificationSentAt,
            DiscountType = user.DiscountType,
            DiscountValue = user.DiscountValue,
            FreeMonths = user.FreeMonths,
            PasswordResetRequired = user.PasswordResetRequired,
            CanManageAccounts = user.CanManageAccounts,
            CanManageStaff = user.CanManageStaff,
            CanManageBilling = user.CanManageBilling,
            CanManageSecurity = user.CanManageSecurity,
            CanViewAuditLogs = user.CanViewAuditLogs,
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

    private static decimal RoundMoney(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}