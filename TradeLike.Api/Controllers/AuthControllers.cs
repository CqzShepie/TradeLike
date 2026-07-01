using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly JwtService _jwtService;

    public AuthController(
        TradeLikeDbContext context,
        JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public sealed record LoginRequest(
        string Email,
        string Password
    );

    public sealed record RegisterRequest(
        string BusinessName,
        string Email,
        string Password
    );

    [EnableRateLimiting("auth-login")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var password = request.Password ?? string.Empty;

        var user = await _context.Users
            .FirstOrDefaultAsync(existingUser => existingUser.Email == email);

        if (user is null ||
            !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return Unauthorized(new
            {
                message = "Invalid email or password."
            });
        }

        if (user.AccountStatus is "Suspended" or "Cancelled")
        {
            return Unauthorized(new
            {
                message = "This account is not currently active."
            });
        }

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var token = CreateToken(user);

        return Ok(BuildAuthResponse(user, token));
    }

    [EnableRateLimiting("auth-register")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var businessName = request.BusinessName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        var password = request.Password ?? string.Empty;

        if (businessName.Length == 0)
        {
            return BadRequest(new { error = "Business name is required." });
        }

        if (email.Length == 0 || !email.Contains('@'))
        {
            return BadRequest(new { error = "A valid email address is required." });
        }

        if (password.Length < 8)
        {
            return BadRequest(new { error = "Password must be at least 8 characters." });
        }

        var duplicate = await _context.Users
            .AsNoTracking()
            .AnyAsync(user => user.Email == email);

        if (duplicate)
        {
            return Conflict(new
            {
                error = "An account with this email already exists."
            });
        }

        var now = DateTime.UtcNow;

        var user = new User
        {
            FirstName = businessName,
            LastName = "Account",
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = "Customer",
            AccountStatus = "Trial",
            IsEmailVerified = false,
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            FreeMonthsExpireAt = null,
            PasswordResetRequired = false,
            BusinessName = businessName,
            OwnerName = businessName,
            OwnerPhone = null,
            SubscriptionPlan = "Trial",
            BillingStatus = "Trial",
            TrialEndsAt = now.AddDays(14),
            AdminTags = null,
            SupportNotes = null,
            HealthStatus = "Green",
            AccountSource = "Website Signup",
            CancelReason = null,
            LastLoginAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        var token = CreateToken(user);

        return Ok(BuildAuthResponse(user, token));
    }

    private string CreateToken(User user)
    {
        var fullName = $"{user.FirstName} {user.LastName}".Trim();

        return _jwtService.GenerateToken(
            userId: user.Id,
            email: user.Email,
            name: fullName,
            role: user.Role);
    }

    private static object BuildAuthResponse(User user, string token)
    {
        var fullName = $"{user.FirstName} {user.LastName}".Trim();

        return new
        {
            token,
            user = new
            {
                id = user.Id,
                email = user.Email,
                name = fullName,
                role = user.Role,
                personalAssistantTo = user.PersonalAssistantTo,
                accountStatus = user.AccountStatus,
                passwordResetRequired = user.PasswordResetRequired,

                canManageAccounts = user.CanManageAccounts,
                canManageStaff = user.CanManageStaff,
                canManageBilling = user.CanManageBilling,
                canManageSecurity = user.CanManageSecurity,
                canViewAuditLogs = user.CanViewAuditLogs,

                canCreateCustomers = user.CanCreateCustomers,
                canEditCustomers = user.CanEditCustomers,
                canCancelCustomers = user.CanCancelCustomers,
                canResetPasswords = user.CanResetPasswords,
                canVerifyEmails = user.CanVerifyEmails,
                canSendEmails = user.CanSendEmails,
                canManageDiscounts = user.CanManageDiscounts,
                canManageFreeMonths = user.CanManageFreeMonths,
                canViewCustomerNotes = user.CanViewCustomerNotes,
                canEditCustomerNotes = user.CanEditCustomerNotes,
                canViewBilling = user.CanViewBilling,
                canManageSubscriptions = user.CanManageSubscriptions,
                canExportData = user.CanExportData,
                canImpersonateCustomer = user.CanImpersonateCustomer,
                canDeleteData = user.CanDeleteData,
                canViewStaff = user.CanViewStaff,
                canCreateStaff = user.CanCreateStaff,
                canCancelStaff = user.CanCancelStaff,
                canEditStaffPermissions = user.CanEditStaffPermissions,
                canViewSecurityLogs = user.CanViewSecurityLogs
            }
        };
    }
}
