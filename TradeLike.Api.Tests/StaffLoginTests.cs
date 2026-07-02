using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;
using TradeLike.Api.Controllers;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class StaffLoginTests
{
    private const string Password = "Password123!";

    [Theory]
    [InlineData("Director")]
    [InlineData("Support")]
    public async Task StaffLoginAcceptsInternalStaffRoles(string role)
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser("staff@example.com", role));
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var result = await controller.StaffLogin(new AuthController.LoginRequest(
            "staff@example.com",
            Password));

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = JsonSerializer.Serialize(ok.Value);
        using var document = JsonDocument.Parse(json);
        var user = document.RootElement.GetProperty("user");

        Assert.Equal(role, user.GetProperty("role").GetString());
        Assert.Equal("Internal", user.GetProperty("plan").GetString());
        Assert.False(string.IsNullOrWhiteSpace(document.RootElement.GetProperty("token").GetString()));
        Assert.NotNull(await context.Users.Where(user => user.Email == "staff@example.com")
            .Select(user => user.LastLoginAt)
            .SingleAsync());
    }

    [Theory]
    [InlineData(CustomerRoles.Director)]
    [InlineData(CustomerRoles.Manager)]
    [InlineData(CustomerRoles.Employee)]
    public async Task StaffLoginRejectsCustomerRoles(string role)
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser("customer@example.com", role));
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var result = await controller.StaffLogin(new AuthController.LoginRequest(
            "customer@example.com",
            Password));

        var forbidden = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidden.StatusCode);
        Assert.Contains("TradeLike staff only", JsonSerializer.Serialize(forbidden.Value));
    }

    [Fact]
    public async Task StaffLoginRejectsInvalidPassword()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser("staff@example.com", "Director"));
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var result = await controller.StaffLogin(new AuthController.LoginRequest(
            "staff@example.com",
            "wrong-password"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task StaffLoginRejectsSuspendedStaff()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser("staff@example.com", "Support", accountStatus: "Suspended"));
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var result = await controller.StaffLogin(new AuthController.LoginRequest(
            "staff@example.com",
            Password));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    private static TradeLikeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TradeLikeDbContext(options);
    }

    private static AuthController CreateController(TradeLikeDbContext context)
    {
        var jwtService = new JwtService(Options.Create(new JwtSettings
        {
            Key = "test-jwt-key-that-is-long-enough-for-hmac",
            Issuer = "TradeLike.Tests",
            Audience = "TradeLike.Tests",
            ExpiryMinutes = 60
        }));

        return new AuthController(context, jwtService, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
    }

    private static User BuildUser(
        string email,
        string role,
        string accountStatus = "Active")
    {
        return new User
        {
            TenantId = 1,
            FirstName = "Test",
            LastName = "User",
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password),
            Role = role,
            AccountStatus = accountStatus,
            SubscriptionPlan = "Internal",
            BillingStatus = "Internal",
            DiscountType = "None",
            HealthStatus = "Green",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}
