using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Auth;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TradeLikeDbContext _context;
    private readonly JwtService _jwtService;
    private readonly PasswordResetService _passwordResetService;

    public AuthController(
        TradeLikeDbContext context,
        JwtService jwtService,
        PasswordResetService passwordResetService)
    {
        _context = context;
        _jwtService = jwtService;
        _passwordResetService = passwordResetService;
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

    [EnableRateLimiting("auth-forgot-password")]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var result = await _passwordResetService.RequestSelfServiceResetAsync(
            request.Email,
            HttpContext,
            HttpContext.RequestAborted);

        var response = new Dictionary<string, object?>
        {
            ["message"] = PasswordResetService.GenericForgotPasswordMessage
        };

        if (result?.DevelopmentResetLink is not null)
        {
            response["resetLink"] = result.DevelopmentResetLink;
            response["expiresAtUtc"] = result.ExpiresAtUtc;
        }

        return Ok(response);
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var result = await _passwordResetService.ResetPasswordAsync(
            request.Token,
            request.NewPassword,
            HttpContext,
            HttpContext.RequestAborted);

        return result switch
        {
            PasswordResetResult.Success => Ok(new { message = "Your password has been reset. You can now sign in." }),
            PasswordResetResult.InvalidPassword => BadRequest(new { error = "Password must be at least 8 characters." }),
            _ => BadRequest(new { error = "This reset link is invalid or has expired." })
        };
    }

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

        var planName = await GetPlanNameAsync(user.TenantId == 0 ? user.Id : user.TenantId, user.SubscriptionPlan);
        var token = CreateToken(user, planName);

        return Ok(BuildAuthResponse(user, token, planName));
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
            Role = CustomerRoles.Director,
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
            SubscriptionPlan = "Solo",
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

        user.TenantId = user.Id;

        await _context.Subscriptions.AddAsync(new Subscription
        {
            TenantId = user.Id,
            PlanId = 1,
            SeatsPurchased = 1,
            BillingStartUtc = now,
            NextInvoiceDateUtc = now.AddDays(14),
            Status = "Trial"
        });

        await _context.SaveChangesAsync();

        var token = CreateToken(user, "Solo");

        return Ok(BuildAuthResponse(user, token, "Solo"));
    }

    private string CreateToken(User user, string planName)
    {
        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        var role = CustomerRoles.Normalize(user.Role);

        return _jwtService.GenerateToken(
            userId: user.Id,
            tenantId: user.TenantId == 0 ? user.Id : user.TenantId,
            email: user.Email,
            name: fullName,
            role: role,
            plan: planName);
    }

    private async Task<string> GetPlanNameAsync(int tenantId, string fallback)
    {
        var subscription = await _context.Subscriptions
            .AsNoTracking()
            .Include(item => item.Plan)
            .FirstOrDefaultAsync(item => item.TenantId == tenantId);

        return subscription?.Plan?.Name ?? (string.IsNullOrWhiteSpace(fallback) || fallback == "Trial" ? "Solo" : fallback);
    }

    private static object BuildAuthResponse(User user, string token, string planName)
    {
        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        var role = CustomerRoles.Normalize(user.Role);

        return new
        {
            token,
            user = new
            {
                id = user.Id,
                email = user.Email,
                name = fullName,
                role,
                plan = planName,
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
