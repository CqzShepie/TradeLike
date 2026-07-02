using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TradeLike.Api.Api.Payments;
using TradeLike.Api.Api.RoutePlanner;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Controllers;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class AuthorizationHardeningTests
{
    [Theory]
    [InlineData("Director")]
    [InlineData("Customer")]
    [InlineData("CustomerDirector")]
    [InlineData("director")]
    public void LegacyOwnerRolesNormaliseToCustomerDirector(string role)
    {
        Assert.Equal(CustomerRoles.Director, CustomerRoles.Normalize(role));
        Assert.True(CustomerRoles.IsDirector(role));
        Assert.True(CustomerRoles.IsCustomerRole(role));
    }

    [Fact]
    public async Task CrossTenantJobReadReturns404()
    {
        await using var context = CreateContext();
        context.Jobs.Add(new Job
        {
            Id = 42,
            TenantId = 2,
            Customer = "Other Tenant",
            Phone = "07123456789",
            JobTitle = "Boiler service",
            Address = "1 Other Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal"
        });
        await context.SaveChangesAsync();

        var controller = new JobsController(new JobService(context))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Employee)
            }
        };

        var result = await controller.GetJob(42);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task PromotionOverSeatLimitReturns402()
    {
        await using var context = CreateContext();
        context.Plans.Add(new Plan
        {
            Id = 1,
            Name = "Solo",
            MonthlyPricePence = 3500,
            MaxIncludedUsers = 1,
            CreatedAt = DateTime.UtcNow
        });
        context.Users.AddRange(
            new User
            {
                Id = 1,
                TenantId = 1,
                FirstName = "Director",
                LastName = "User",
                Email = "director@example.com",
                PasswordHash = "hash",
                Role = CustomerRoles.Director,
                AccountStatus = "Active"
            },
            new User
            {
                Id = 2,
                TenantId = 1,
                FirstName = "Employee",
                LastName = "User",
                Email = "employee@example.com",
                PasswordHash = "hash",
                Role = CustomerRoles.Employee,
                AccountStatus = "Active"
            });
        context.Subscriptions.Add(new Subscription
        {
            TenantId = 1,
            PlanId = 1,
            SeatsPurchased = 1,
            BillingStartUtc = DateTime.UtcNow,
            NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1),
            Status = "Active"
        });
        await context.SaveChangesAsync();

        var controller = new UsersController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Director)
            }
        };

        var result = await controller.UpdateRole(
            2,
            new UpdateCustomerUserRoleRequest(CustomerRoles.Manager));

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status402PaymentRequired, objectResult.StatusCode);
    }

    [Fact]
    public async Task CustomerDirectorCannotAccessStudioCustomerList()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser(
            id: 1,
            email: "owner@example.com",
            role: CustomerRoles.Director,
            tenantId: 1,
            plan: "Solo"));
        await context.SaveChangesAsync();

        var controller = new AdminUserController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForStudioUser("owner@example.com")
            }
        };

        var result = await controller.GetUsers(null);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task StudioCustomerListIncludesCustomerRolesAndExcludesInternalStaff()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            BuildUser(
                id: 1,
                email: "studio@example.com",
                role: "Director",
                tenantId: 100,
                plan: "Internal",
                canManageAccounts: true),
            BuildUser(
                id: 2,
                email: "director@example.com",
                role: CustomerRoles.Director,
                tenantId: 2,
                plan: "Solo"),
            BuildUser(
                id: 3,
                email: "manager@example.com",
                role: CustomerRoles.Manager,
                tenantId: 3,
                plan: "Team"),
            BuildUser(
                id: 4,
                email: "support@example.com",
                role: "Support",
                tenantId: 100,
                plan: "Internal"));
        await context.SaveChangesAsync();

        var controller = new AdminUserController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForStudioUser("studio@example.com")
            }
        };

        var result = await controller.GetUsers(null);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var users = Assert.IsAssignableFrom<IReadOnlyList<AdminUserResponse>>(ok.Value);

        Assert.Contains(users, user => user.Email == "director@example.com");
        Assert.Contains(users, user => user.Email == "manager@example.com");
        Assert.DoesNotContain(users, user => user.Email == "support@example.com");
    }

    [Fact]
    [Trait("Category", "Route")]
    public async Task DailyRouteRequiresDate()
    {
        var controller = new RoutesController(null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Employee)
            }
        };

        var result = await controller.GetDailyRoute(default, null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    [Trait("Category", "Payments")]
    public async Task CheckoutRejectsUnknownProvider()
    {
        await using var context = CreateContext();
        context.Invoices.Add(new Invoice
        {
            Id = 10,
            TenantId = 1,
            InvoiceNumber = "INV-001",
            CustomerName = "Customer",
            Title = "Invoice",
            TotalPence = 12000,
            Status = "Sent"
        });
        await context.SaveChangesAsync();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["STRIPE_KEY"] = "test"
            })
            .Build();

        var controller = new PaymentsController(
            context,
            configuration,
            NullLogger<PaymentsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Employee)
            }
        };

        var result = await controller.CreateCheckout(new CheckoutRequest(10, "cash"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    private static TradeLikeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TradeLikeDbContext(options);
    }

    private static User BuildUser(
        int id,
        string email,
        string role,
        int tenantId,
        string plan,
        bool canManageAccounts = false)
    {
        return new User
        {
            Id = id,
            TenantId = tenantId,
            FirstName = "Test",
            LastName = "User",
            Email = email,
            PasswordHash = "hash",
            Role = role,
            AccountStatus = "Active",
            SubscriptionPlan = plan,
            BillingStatus = plan == "Internal" ? "Internal" : "Active",
            DiscountType = "None",
            HealthStatus = "Green",
            CanManageAccounts = canManageAccounts,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static HttpContext HttpContextForTenant(int tenantId, string role)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim("tid", tenantId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Role, role)
        }, "Test");

        return new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity)
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
}
