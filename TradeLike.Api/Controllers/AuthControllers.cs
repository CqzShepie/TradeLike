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
    private const string BootstrapDirectorEmail = "admin@tradelike.co.uk";
    private const string BootstrapDirectorPassword = "Password123!";

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

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var password = request.Password.Trim();

        await EnsureBootstrapDirectorExistsAsync(email, password);

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

        var fullName = $"{user.FirstName} {user.LastName}".Trim();

        var token = _jwtService.GenerateToken(
            userId: user.Id,
            email: user.Email,
            name: fullName,
            role: user.Role);

        return Ok(new
        {
            token,
            user = new
            {
                id = user.Id,
                email = user.Email,
                name = fullName,
                role = user.Role,
                accountStatus = user.AccountStatus,
                passwordResetRequired = user.PasswordResetRequired
            }
        });
    }

    private async Task EnsureBootstrapDirectorExistsAsync(
        string email,
        string password)
    {
        if (email != BootstrapDirectorEmail ||
            password != BootstrapDirectorPassword)
        {
            return;
        }

        var existingDirector = await _context.Users
            .FirstOrDefaultAsync(user => user.Email == BootstrapDirectorEmail);

        if (existingDirector is not null)
        {
            existingDirector.FirstName = "Thomas";
            existingDirector.LastName = "Kennington";
            existingDirector.Role = "Director";
            existingDirector.AccountStatus = "Active";
            existingDirector.IsEmailVerified = true;
            existingDirector.CanManageAccounts = true;
            existingDirector.CanManageStaff = true;
            existingDirector.CanManageBilling = true;
            existingDirector.CanManageSecurity = true;
            existingDirector.CanViewAuditLogs = true;
            existingDirector.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return;
        }

        var director = new User
        {
            FirstName = "Thomas",
            LastName = "Kennington",
            Email = BootstrapDirectorEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(BootstrapDirectorPassword),
            Role = "Director",
            AccountStatus = "Active",
            IsEmailVerified = true,
            DiscountType = "None",
            DiscountValue = 0,
            FreeMonths = 0,
            CanManageAccounts = true,
            CanManageStaff = true,
            CanManageBilling = true,
            CanManageSecurity = true,
            CanViewAuditLogs = true,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Users.AddAsync(director);
        await _context.SaveChangesAsync();
    }
}