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
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
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

    private const string AdminEmail = "admin@tradelike.co.uk";

    private readonly TradeLikeDbContext _context;

    public AdminUsersController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> GetUsers(
        [FromQuery] string? search)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        var query = _context.Users.AsNoTracking();

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

    [HttpPost]
    public async Task<ActionResult<AdminUserResponse>> CreateUser(
        [FromBody] CreateAdminUserRequest request)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        try
        {
            var user = await CreateUserInternal(request);
            var response = ToResponse(user);

            return CreatedAtAction(
                nameof(GetUsers),
                new { id = response.Id },
                response);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}/account")]
    public async Task<ActionResult<AdminUserResponse>> UpdateAccount(
        int id,
        [FromBody] UpdateAdminUserAccountRequest request)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        try
        {
            var user = await _context.Users.FindAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            user.AccountStatus = Canonicalise(request.AccountStatus, AllowedAccountStatuses);
            user.DiscountType = Canonicalise(request.DiscountType, AllowedDiscountTypes);
            user.DiscountValue = RoundMoney(request.DiscountValue);
            user.FreeMonths = request.FreeMonths;
            user.AdminNotes = string.IsNullOrWhiteSpace(request.AdminNotes)
                ? null
                : request.AdminNotes.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            ValidateAccount(user);

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<ActionResult<AdminUserResponse>> ResetPassword(
        int id,
        [FromBody] ResetAdminUserPasswordRequest request)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        try
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) ||
                request.NewPassword.Length < 8)
            {
                throw new ValidationException(
                    "New password must be at least 8 characters.");
            }

            var user = await _context.Users.FindAsync(id);

            if (user is null)
            {
                return NotFound();
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordResetRequired = request.RequirePasswordReset;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ToResponse(user));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/mark-email-verified")]
    public async Task<ActionResult<AdminUserResponse>> MarkEmailVerified(int id)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        var user = await _context.Users.FindAsync(id);

        if (user is null)
        {
            return NotFound();
        }

        user.IsEmailVerified = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToResponse(user));
    }

    [HttpPost("{id:int}/send-verification-email")]
    public async Task<ActionResult<object>> SendVerificationEmail(int id)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        var user = await _context.Users.FindAsync(id);

        if (user is null)
        {
            return NotFound();
        }

        user.EmailVerificationSentAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Verification email send action recorded. Real email sending will be wired when we add the email provider.",
            user = ToResponse(user)
        });
    }

    private async Task<User> CreateUserInternal(CreateAdminUserRequest request)
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

        if (string.IsNullOrWhiteSpace(request.Password) ||
            request.Password.Length < 8)
        {
            throw new ValidationException("Password must be at least 8 characters.");
        }

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

    private static void ValidateAccount(User user)
    {
        if (!AllowedAccountStatuses.Contains(
                user.AccountStatus,
                StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Account status is invalid. Use Trial, Active, PastDue, Suspended, or Cancelled.");
        }

        if (!AllowedDiscountTypes.Contains(
                user.DiscountType,
                StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Discount type is invalid. Use None, Amount, or Percentage.");
        }

        if (user.DiscountValue < 0)
        {
            throw new ValidationException("Discount value cannot be negative.");
        }

        if (user.DiscountType == "None" && user.DiscountValue != 0)
        {
            throw new ValidationException(
                "Discount value must be 0 when discount type is None.");
        }

        if (user.DiscountType == "Percentage" && user.DiscountValue > 100)
        {
            throw new ValidationException(
                "Percentage discount cannot be more than 100%.");
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

    private bool IsAdmin()
    {
        var email =
            User.FindFirstValue(JwtRegisteredClaimNames.Email) ??
            User.FindFirstValue(ClaimTypes.Email) ??
            string.Empty;

        return string.Equals(email, AdminEmail, StringComparison.OrdinalIgnoreCase);
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

    private static decimal RoundMoney(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}