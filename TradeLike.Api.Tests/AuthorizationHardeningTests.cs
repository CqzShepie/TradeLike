using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Text.Json;
using TradeLike.Api.Api.Expenses;
using TradeLike.Api.Api.Payments;
using TradeLike.Api.Api.RoutePlanner;
using TradeLike.Api.Controllers;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;
using TradeLike.Api.Workflows;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class AuthorizationHardeningTests
{
    [Fact]
    public async Task MileageExpenseCalculatesAmountPence()
    {
        await using var context = CreateContext();
        context.MileageRates.Add(new MileageRate
        {
            TenantId = 1,
            PencePerMile = 45,
            EffectiveFromUtc = DateTime.UtcNow.AddDays(-30)
        });
        await context.SaveChangesAsync();

        var controller = new ExpensesController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Employee)
            }
        };

        var result = await controller.CreateExpense(
            new SaveExpenseRequest(null, DateTime.UtcNow, "Mileage", null, "Site visit", null, 12.5m),
            CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var expense = Assert.IsType<ExpenseResponse>(created.Value);
        Assert.Equal(563, expense.AmountPence);
    }

    [Fact]
    public void InvoicePaidTriggerCreatesApplyDiscountWorkflowLog()
    {
        using var document = JsonDocument.Parse(
            """
            {
              "nodes": [
                { "id": "trigger", "type": "InvoicePaid" },
                { "id": "action", "type": "ApplyDiscount" }
              ]
            }
            """);

        var logs = PremiumWorkflowEngine.BuildInvoicePaidLogs(document.RootElement, 99);

        var log = Assert.Single(logs);
        Assert.Equal("InvoicePaid", log.Trigger);
        Assert.Equal("ApplyDiscount", log.Action);
        Assert.Equal(99, log.EntityId);
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
}
