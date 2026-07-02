using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TradeLike.Api.Configuration;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Controllers;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class PlanSubscriptionConsistencyTests
{
    [Fact]
    public void FinalPlanPricingMatchesApprovedCatalog()
    {
        Assert.Equal(3995, PlanPricing.SoloMonthlyPricePence);
        Assert.Equal(9995, PlanPricing.TeamMonthlyPricePence);
        Assert.Equal(15995, PlanPricing.BusinessMonthlyPricePence);
        Assert.Null(BuildPlan(4, "Enterprise", null).MonthlyPricePence);
        Assert.Equal(29985, PlanPricing.SelfServeMonthlyPlanPriceSumPence);
        Assert.Equal(72, PlanPricing.SoloExpectedMixPercent);
        Assert.Equal(20, PlanPricing.TeamExpectedMixPercent);
        Assert.Equal(7, PlanPricing.BusinessExpectedMixPercent);
        Assert.Equal(1, PlanPricing.EnterpriseExpectedMixPercent);
    }

    [Fact]
    public async Task ChangingToBusinessUpdatesUserAndSubscriptionPlan()
    {
        await using var context = CreateContext();
        await SeedPlansAndUsersAsync(context);

        var controller = BuildAdminController(context);
        var result = await controller.UpdateCustomerPlan(
            20,
            new UpdateCustomerPlanRequest
            {
                Plan = "Business",
                SeatsPurchased = 11,
                BillingStatus = "Active",
                Reason = "Customer upgraded"
            });

        Assert.IsType<OkObjectResult>(result.Result);

        var user = await context.Users.SingleAsync(user => user.Id == 20);
        var subscription = await context.Subscriptions
            .Include(subscription => subscription.Plan)
            .SingleAsync(subscription => subscription.TenantId == 20);

        Assert.Equal("Business", user.SubscriptionPlan);
        Assert.Equal("Business", subscription.Plan?.Name);
        Assert.Equal(3, subscription.PlanId);
    }

    [Fact]
    public async Task LoginReturnsBusinessAfterAdminPlanChange()
    {
        await using var context = CreateContext();
        await SeedPlansAndUsersAsync(context);

        var adminController = BuildAdminController(context);
        await adminController.UpdateCustomerPlan(
            20,
            new UpdateCustomerPlanRequest
            {
                Plan = "Business",
                SeatsPurchased = 11,
                BillingStatus = "Active",
                Reason = "Customer upgraded"
            });

        var authController = new AuthController(context, CreateJwtService(), null!);
        var loginResult = await authController.Login(new AuthController.LoginRequest(
            "customer@example.com",
            "Password123!"));

        var ok = Assert.IsType<OkObjectResult>(loginResult);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));

        Assert.Equal("Business", json.RootElement.GetProperty("user").GetProperty("plan").GetString());
    }

    [Fact]
    public async Task MissingSubscriptionRowIsCreatedDuringPlanChange()
    {
        await using var context = CreateContext();
        await SeedPlansAndUsersAsync(context, createCustomerSubscription: false);

        var controller = BuildAdminController(context);
        var result = await controller.UpdateCustomerPlan(
            20,
            new UpdateCustomerPlanRequest
            {
                Plan = "Business",
                SeatsPurchased = 11,
                BillingStatus = "Active",
                Reason = "Create missing subscription"
            });

        Assert.IsType<OkObjectResult>(result.Result);

        var subscription = await context.Subscriptions
            .Include(subscription => subscription.Plan)
            .SingleAsync(subscription => subscription.TenantId == 20);

        Assert.Equal("Business", subscription.Plan?.Name);
        Assert.Equal(11, subscription.SeatsPurchased);
        Assert.Equal("Active", subscription.Status);
    }

    [Fact]
    public async Task InternalPlanIsRejectedForCustomerTenantAccount()
    {
        await using var context = CreateContext();
        await SeedPlansAndUsersAsync(context);

        var controller = BuildAdminController(context);
        var result = await controller.UpdateCustomerPlan(
            20,
            new UpdateCustomerPlanRequest
            {
                Plan = "Internal",
                SeatsPurchased = 1,
                BillingStatus = "Active",
                Reason = "Invalid customer plan"
            });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Theory]
    [InlineData("Solo", 2)]
    [InlineData("Team", 1)]
    [InlineData("Team", 11)]
    [InlineData("Business", 10)]
    [InlineData("Business", 26)]
    public async Task SeatRulesRejectInvalidCustomerPlanSeatCounts(string plan, int seatsPurchased)
    {
        await using var context = CreateContext();
        await SeedPlansAndUsersAsync(context);

        var controller = BuildAdminController(context);
        var result = await controller.UpdateCustomerPlan(
            20,
            new UpdateCustomerPlanRequest
            {
                Plan = plan,
                SeatsPurchased = seatsPurchased,
                BillingStatus = "Active",
                Reason = "Invalid seat count"
            });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task PlanChangeAuditContainsBeforeAfterSeatsAndReason()
    {
        await using var context = CreateContext();
        await SeedPlansAndUsersAsync(context);

        var controller = BuildAdminController(context);
        await controller.UpdateCustomerPlan(
            20,
            new UpdateCustomerPlanRequest
            {
                Plan = "Business",
                SeatsPurchased = 11,
                BillingStatus = "Active",
                Reason = "Annual growth"
            });

        var auditLog = await context.AdminAuditLogs.SingleAsync(log => log.Action == "PlanChanged");

        Assert.Contains("Reason: Annual growth", auditLog.Details);
        Assert.Contains("OldPlan=Solo", auditLog.Details);
        Assert.Contains("NewPlan=Business", auditLog.Details);
        Assert.Contains("OldSeats=1", auditLog.Details);
        Assert.Contains("NewSeats=11", auditLog.Details);
    }

    [Fact]
    public async Task AdminPlanChangeRepairsMismatchSoLoginDoesNotReturnOldSubscriptionPlan()
    {
        await using var context = CreateContext();
        await SeedPlansAndUsersAsync(context);

        var customer = await context.Users.SingleAsync(user => user.Id == 20);
        customer.SubscriptionPlan = "Business";
        await context.SaveChangesAsync();

        var adminController = BuildAdminController(context);
        await adminController.UpdateCustomerPlan(
            20,
            new UpdateCustomerPlanRequest
            {
                Plan = "Business",
                SeatsPurchased = 11,
                BillingStatus = "Active",
                Reason = "Repair mismatch"
            });

        var subscription = await context.Subscriptions
            .Include(subscription => subscription.Plan)
            .SingleAsync(subscription => subscription.TenantId == 20);

        Assert.Equal("Business", subscription.Plan?.Name);

        var authController = new AuthController(context, CreateJwtService(), null!);
        var loginResult = await authController.Login(new AuthController.LoginRequest(
            "customer@example.com",
            "Password123!"));

        var ok = Assert.IsType<OkObjectResult>(loginResult);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));

        Assert.Equal("Business", json.RootElement.GetProperty("user").GetProperty("plan").GetString());

        var auditLog = await context.AdminAuditLogs.SingleAsync(log => log.Action == "PlanChanged");
        Assert.Contains("RepairedPlanMismatch=True", auditLog.Details);
    }

    private static TradeLikeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TradeLikeDbContext(options);
    }

    private static async Task SeedPlansAndUsersAsync(
        TradeLikeDbContext context,
        bool createCustomerSubscription = true)
    {
        context.Plans.AddRange(
            BuildPlan(1, "Solo", 1),
            BuildPlan(2, "Team", 10),
            BuildPlan(3, "Business", 25),
            BuildPlan(4, "Enterprise", null),
            BuildPlan(5, "Internal", null));

        context.Users.AddRange(
            BuildStudioUser(),
            BuildCustomerUser());

        if (createCustomerSubscription)
        {
            context.Subscriptions.Add(new Subscription
            {
                TenantId = 20,
                PlanId = 1,
                SeatsPurchased = 1,
                BillingStartUtc = DateTime.UtcNow,
                NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1),
                Status = "Active"
            });
        }

        await context.SaveChangesAsync();
    }

    private static Plan BuildPlan(int id, string name, int? maxIncludedUsers)
    {
        return new Plan
        {
            Id = id,
            Name = name,
            MonthlyPricePence = name switch
            {
                "Solo" => PlanPricing.SoloMonthlyPricePence,
                "Team" => PlanPricing.TeamMonthlyPricePence,
                "Business" => PlanPricing.BusinessMonthlyPricePence,
                "Enterprise" => null,
                _ => 0
            },
            MaxIncludedUsers = maxIncludedUsers,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static User BuildStudioUser()
    {
        return new User
        {
            Id = 10,
            TenantId = 10,
            FirstName = "Studio",
            LastName = "Admin",
            Email = "studio@example.com",
            PasswordHash = "hash",
            Role = "Director",
            AccountStatus = "Active",
            SubscriptionPlan = "Internal",
            BillingStatus = "Internal",
            DiscountType = "None",
            HealthStatus = "Green",
            CanManageSubscriptions = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static User BuildCustomerUser()
    {
        return new User
        {
            Id = 20,
            TenantId = 20,
            FirstName = "Customer",
            LastName = "Director",
            Email = "customer@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
            Role = CustomerRoles.Director,
            AccountStatus = "Active",
            SubscriptionPlan = "Solo",
            BillingStatus = "Active",
            DiscountType = "None",
            HealthStatus = "Green",
            BusinessName = "Customer Co",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static AdminUserController BuildAdminController(TradeLikeDbContext context)
    {
        return new AdminUserController(context, null)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForStudioUser("studio@example.com")
            }
        };
    }

    private static HttpContext HttpContextForStudioUser(string email)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Email, email)
        }, "Test");

        return new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity)
        };
    }

    private static JwtService CreateJwtService()
    {
        return new JwtService(Options.Create(new JwtSettings
        {
            Key = "12345678901234567890123456789012",
            Issuer = "TradeLike.Tests",
            Audience = "TradeLike.Tests",
            ExpiryMinutes = 60
        }));
    }
}
