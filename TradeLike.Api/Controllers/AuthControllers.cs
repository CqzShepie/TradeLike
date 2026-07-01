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
        await EnsureAdminUpgradeSchemaExistsAsync();

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
        await EnsureAdminUpgradeSchemaExistsAsync();

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

    private async Task EnsureAdminUpgradeSchemaExistsAsync()
    {
        const string sql = """
IF COL_LENGTH('Users', 'PersonalAssistantTo') IS NULL
    ALTER TABLE [Users] ADD [PersonalAssistantTo] nvarchar(220) NULL;

IF COL_LENGTH('Users', 'FreeMonthsExpireAt') IS NULL
    ALTER TABLE [Users] ADD [FreeMonthsExpireAt] datetime2 NULL;

IF COL_LENGTH('Users', 'BusinessName') IS NULL
    ALTER TABLE [Users] ADD [BusinessName] nvarchar(180) NULL;

IF COL_LENGTH('Users', 'OwnerName') IS NULL
    ALTER TABLE [Users] ADD [OwnerName] nvarchar(180) NULL;

IF COL_LENGTH('Users', 'OwnerPhone') IS NULL
    ALTER TABLE [Users] ADD [OwnerPhone] nvarchar(40) NULL;

IF COL_LENGTH('Users', 'SubscriptionPlan') IS NULL
    ALTER TABLE [Users] ADD [SubscriptionPlan] nvarchar(40) NOT NULL CONSTRAINT [DF_Users_SubscriptionPlan] DEFAULT N'Trial';

IF COL_LENGTH('Users', 'BillingStatus') IS NULL
    ALTER TABLE [Users] ADD [BillingStatus] nvarchar(40) NOT NULL CONSTRAINT [DF_Users_BillingStatus] DEFAULT N'Trial';

IF COL_LENGTH('Users', 'TrialEndsAt') IS NULL
    ALTER TABLE [Users] ADD [TrialEndsAt] datetime2 NULL;

IF COL_LENGTH('Users', 'AdminTags') IS NULL
    ALTER TABLE [Users] ADD [AdminTags] nvarchar(500) NULL;

IF COL_LENGTH('Users', 'SupportNotes') IS NULL
    ALTER TABLE [Users] ADD [SupportNotes] nvarchar(4000) NULL;

IF COL_LENGTH('Users', 'HealthStatus') IS NULL
    ALTER TABLE [Users] ADD [HealthStatus] nvarchar(30) NOT NULL CONSTRAINT [DF_Users_HealthStatus] DEFAULT N'Green';

IF COL_LENGTH('Users', 'LastLoginAt') IS NULL
    ALTER TABLE [Users] ADD [LastLoginAt] datetime2 NULL;

IF COL_LENGTH('Users', 'AccountSource') IS NULL
    ALTER TABLE [Users] ADD [AccountSource] nvarchar(120) NULL;

IF COL_LENGTH('Users', 'CancelReason') IS NULL
    ALTER TABLE [Users] ADD [CancelReason] nvarchar(500) NULL;

IF COL_LENGTH('Users', 'OnboardingEmailSentAt') IS NULL
    ALTER TABLE [Users] ADD [OnboardingEmailSentAt] datetime2 NULL;

IF COL_LENGTH('Users', 'CanManageAccounts') IS NULL
    ALTER TABLE [Users] ADD [CanManageAccounts] bit NOT NULL CONSTRAINT [DF_Users_CanManageAccounts] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanManageStaff') IS NULL
    ALTER TABLE [Users] ADD [CanManageStaff] bit NOT NULL CONSTRAINT [DF_Users_CanManageStaff] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanManageBilling') IS NULL
    ALTER TABLE [Users] ADD [CanManageBilling] bit NOT NULL CONSTRAINT [DF_Users_CanManageBilling] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanManageSecurity') IS NULL
    ALTER TABLE [Users] ADD [CanManageSecurity] bit NOT NULL CONSTRAINT [DF_Users_CanManageSecurity] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanViewAuditLogs') IS NULL
    ALTER TABLE [Users] ADD [CanViewAuditLogs] bit NOT NULL CONSTRAINT [DF_Users_CanViewAuditLogs] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanCreateCustomers') IS NULL
    ALTER TABLE [Users] ADD [CanCreateCustomers] bit NOT NULL CONSTRAINT [DF_Users_CanCreateCustomers] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanEditCustomers') IS NULL
    ALTER TABLE [Users] ADD [CanEditCustomers] bit NOT NULL CONSTRAINT [DF_Users_CanEditCustomers] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanCancelCustomers') IS NULL
    ALTER TABLE [Users] ADD [CanCancelCustomers] bit NOT NULL CONSTRAINT [DF_Users_CanCancelCustomers] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanResetPasswords') IS NULL
    ALTER TABLE [Users] ADD [CanResetPasswords] bit NOT NULL CONSTRAINT [DF_Users_CanResetPasswords] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanVerifyEmails') IS NULL
    ALTER TABLE [Users] ADD [CanVerifyEmails] bit NOT NULL CONSTRAINT [DF_Users_CanVerifyEmails] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanSendEmails') IS NULL
    ALTER TABLE [Users] ADD [CanSendEmails] bit NOT NULL CONSTRAINT [DF_Users_CanSendEmails] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanManageDiscounts') IS NULL
    ALTER TABLE [Users] ADD [CanManageDiscounts] bit NOT NULL CONSTRAINT [DF_Users_CanManageDiscounts] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanManageFreeMonths') IS NULL
    ALTER TABLE [Users] ADD [CanManageFreeMonths] bit NOT NULL CONSTRAINT [DF_Users_CanManageFreeMonths] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanViewCustomerNotes') IS NULL
    ALTER TABLE [Users] ADD [CanViewCustomerNotes] bit NOT NULL CONSTRAINT [DF_Users_CanViewCustomerNotes] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanEditCustomerNotes') IS NULL
    ALTER TABLE [Users] ADD [CanEditCustomerNotes] bit NOT NULL CONSTRAINT [DF_Users_CanEditCustomerNotes] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanViewBilling') IS NULL
    ALTER TABLE [Users] ADD [CanViewBilling] bit NOT NULL CONSTRAINT [DF_Users_CanViewBilling] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanManageSubscriptions') IS NULL
    ALTER TABLE [Users] ADD [CanManageSubscriptions] bit NOT NULL CONSTRAINT [DF_Users_CanManageSubscriptions] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanExportData') IS NULL
    ALTER TABLE [Users] ADD [CanExportData] bit NOT NULL CONSTRAINT [DF_Users_CanExportData] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanImpersonateCustomer') IS NULL
    ALTER TABLE [Users] ADD [CanImpersonateCustomer] bit NOT NULL CONSTRAINT [DF_Users_CanImpersonateCustomer] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanDeleteData') IS NULL
    ALTER TABLE [Users] ADD [CanDeleteData] bit NOT NULL CONSTRAINT [DF_Users_CanDeleteData] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanViewStaff') IS NULL
    ALTER TABLE [Users] ADD [CanViewStaff] bit NOT NULL CONSTRAINT [DF_Users_CanViewStaff] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanCreateStaff') IS NULL
    ALTER TABLE [Users] ADD [CanCreateStaff] bit NOT NULL CONSTRAINT [DF_Users_CanCreateStaff] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanCancelStaff') IS NULL
    ALTER TABLE [Users] ADD [CanCancelStaff] bit NOT NULL CONSTRAINT [DF_Users_CanCancelStaff] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanEditStaffPermissions') IS NULL
    ALTER TABLE [Users] ADD [CanEditStaffPermissions] bit NOT NULL CONSTRAINT [DF_Users_CanEditStaffPermissions] DEFAULT CAST(0 AS bit);

IF COL_LENGTH('Users', 'CanViewSecurityLogs') IS NULL
    ALTER TABLE [Users] ADD [CanViewSecurityLogs] bit NOT NULL CONSTRAINT [DF_Users_CanViewSecurityLogs] DEFAULT CAST(0 AS bit);

IF OBJECT_ID(N'[AdminAuditLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [AdminAuditLogs]
    (
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_AdminAuditLogs] PRIMARY KEY,
        [ActorUserId] int NOT NULL,
        [ActorEmail] nvarchar(255) NOT NULL,
        [ActorName] nvarchar(220) NOT NULL,
        [ActorRole] nvarchar(40) NOT NULL,
        [Action] nvarchar(120) NOT NULL,
        [TargetType] nvarchar(80) NOT NULL,
        [TargetId] int NULL,
        [TargetEmail] nvarchar(255) NULL,
        [Summary] nvarchar(500) NOT NULL,
        [Details] nvarchar(4000) NULL,
        [IpAddress] nvarchar(80) NULL,
        [UserAgent] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL
    );

    CREATE INDEX [IX_AdminAuditLogs_CreatedAt] ON [AdminAuditLogs] ([CreatedAt]);
    CREATE INDEX [IX_AdminAuditLogs_ActorUserId] ON [AdminAuditLogs] ([ActorUserId]);
    CREATE INDEX [IX_AdminAuditLogs_ActorEmail] ON [AdminAuditLogs] ([ActorEmail]);
    CREATE INDEX [IX_AdminAuditLogs_TargetId] ON [AdminAuditLogs] ([TargetId]);
    CREATE INDEX [IX_AdminAuditLogs_TargetEmail] ON [AdminAuditLogs] ([TargetEmail]);
END;
""";

        await _context.Database.ExecuteSqlRawAsync(sql);
    }
}
