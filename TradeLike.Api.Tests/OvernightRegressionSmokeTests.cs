using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Contracts.Customers;
using TradeLike.Api.Contracts.Jobs;
using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Controllers;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class OvernightRegressionSmokeTests
{
    [Fact]
    public async Task CustomerListIsTenantScoped()
    {
        await using var context = CreateContext();
        context.Customers.AddRange(
            BuildCustomer(1, 1, "Tenant One"),
            BuildCustomer(2, 2, "Tenant Two"));
        await context.SaveChangesAsync();

        var customers = await new CustomerService(context).GetAllAsync(1);

        var customer = Assert.Single(customers);
        Assert.Equal("Tenant One", customer.Name);
    }

    [Fact]
    public void CustomerCreateContractRejectsMissingNameAndBadEmail()
    {
        var request = new CreateCustomerRequest
        {
            Name = "",
            Email = "not-an-email",
            Phone = "07981 125031",
            Address = "1 Trade Street"
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.Contains("Customer name is required."));
        Assert.Contains(errors, error => error.Contains("Enter a valid email address."));
    }

    [Fact]
    public async Task JobsListIsTenantScoped()
    {
        await using var context = CreateContext();
        context.Jobs.AddRange(
            BuildJob(1, 1, "Tenant One Job"),
            BuildJob(2, 2, "Tenant Two Job"));
        await context.SaveChangesAsync();

        var jobs = await new JobService(context).GetAllAsync(1);

        var job = Assert.Single(jobs);
        Assert.Equal("Tenant One Job", job.JobTitle);
    }

    [Fact]
    public async Task CreateJobRejectsCustomerFromAnotherTenant()
    {
        await using var context = CreateContext();
        context.Customers.Add(BuildCustomer(10, 2, "Other Tenant"));
        await context.SaveChangesAsync();

        var service = new JobService(context);
        var request = new CreateJobRequest
        {
            CustomerId = 10,
            Customer = "Other Tenant",
            Phone = "07981 125031",
            JobTitle = "Boiler service",
            Address = "1 Trade Street",
            ScheduledDate = DateTime.Today.AddDays(1)
        };

        var ex = await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(request, 1));
        Assert.Equal("Customer was not found.", ex.Message);
    }

    [Fact]
    public async Task QuoteTotalsCannotBeNegative()
    {
        await using var context = CreateContext();
        context.Customers.Add(BuildCustomer(1, 1, "Sarah Johnson"));
        await context.SaveChangesAsync();

        var quote = BuildQuote(1, 1, "Draft");
        quote.LineItems[0].UnitPrice = -10;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => new QuoteService(context).CreateAsync(quote, 1));
        Assert.Contains("unit price cannot be negative", ex.Message);
    }

    [Fact]
    public async Task QuoteToJobConversionRemainsTenantScoped()
    {
        await using var context = CreateContext();
        context.Customers.Add(BuildCustomer(2, 2, "Other Tenant"));
        context.Quotes.Add(BuildQuote(20, 2, "Accepted", customerId: 2));
        await context.SaveChangesAsync();

        var job = await new QuoteService(context).ConvertAcceptedQuoteToJobAsync(
            20,
            new ConvertQuoteToJobRequest
            {
                JobTitle = "Boiler install",
                ScheduledDate = DateTime.Today.AddDays(1),
                Phone = "07981 125031",
                Address = "1 Trade Street"
            },
            1);

        Assert.Null(job);
    }

    [Fact]
    public async Task AcceptedQuoteCannotBeConvertedTwice()
    {
        await using var context = CreateContext();
        context.Customers.Add(BuildCustomer(1, 1, "Sarah Johnson"));
        context.Quotes.Add(BuildQuote(50, 1, "Accepted"));
        context.Jobs.Add(BuildJob(99, 1, "Converted job", quoteId: 50));
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ValidationException>(() => new QuoteService(context).ConvertAcceptedQuoteToJobAsync(
            50,
            new ConvertQuoteToJobRequest
            {
                JobTitle = "Boiler install",
                ScheduledDate = DateTime.Today.AddDays(1),
                Phone = "07981 125031",
                Address = "1 Trade Street"
            },
            1));

        Assert.Equal("This quote has already been converted to a job.", ex.Message);
    }

    [Fact]
    public async Task CustomerUserCannotAccessAdminCustomerList()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Solo"));
        await context.SaveChangesAsync();

        var controller = new AdminUserController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForEmail("owner@example.com")
            }
        };

        var result = await controller.GetUsers(null);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task InternalStaffCanAccessPermittedAdminCustomerList()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            BuildUser(1, "support@tradelike.co.uk", "Support", 100, "Internal", canManageAccounts: true),
            BuildUser(2, "customer@example.com", CustomerRoles.Director, 2, "Solo"));
        await context.SaveChangesAsync();

        var controller = new AdminUserController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForEmail("support@tradelike.co.uk")
            }
        };

        var result = await controller.GetUsers(null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var users = Assert.IsAssignableFrom<IReadOnlyList<TradeLike.Api.Contracts.Admin.AdminUserResponse>>(ok.Value);
        Assert.Contains(users, user => user.Email == "customer@example.com");
    }

    [Fact]
    public async Task PlanChangeRequiresAuditReason()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            BuildUser(1, "director@tradelike.co.uk", "Director", 100, "Internal", canManageSubscriptions: true),
            BuildUser(2, "customer@example.com", CustomerRoles.Director, 2, "Solo"));
        await context.SaveChangesAsync();

        var controller = new AdminUserController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForEmail("director@tradelike.co.uk")
            }
        };

        var result = await controller.UpdateCustomerPlan(2, new UpdateCustomerPlanRequest
        {
            Plan = "Team",
            SeatsPurchased = 2,
            Reason = ""
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Contains("Reason is required", badRequest.Value?.ToString());
    }

    private static TradeLikeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TradeLikeDbContext(options);
    }

    private static Customer BuildCustomer(int id, int tenantId, string name)
    {
        return new Customer
        {
            Id = id,
            TenantId = tenantId,
            Name = name,
            Phone = "07981 125031",
            Email = $"{name.Replace(" ", ".").ToLowerInvariant()}@example.com",
            Address = "1 Trade Street"
        };
    }

    private static Job BuildJob(int id, int tenantId, string title, int? quoteId = null)
    {
        return new Job
        {
            Id = id,
            TenantId = tenantId,
            Customer = "Sarah Johnson",
            Phone = "07981 125031",
            JobTitle = title,
            Address = "1 Trade Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal",
            Notes = "Access through side gate.",
            QuoteId = quoteId
        };
    }

    private static Quote BuildQuote(int id, int tenantId, string status, int customerId = 1)
    {
        return new Quote
        {
            Id = id,
            TenantId = tenantId,
            CustomerId = customerId,
            CustomerName = "Sarah Johnson",
            Title = "Bathroom refit",
            Status = status,
            DiscountType = "Amount",
            LineItems = new List<QuoteLineItem>
            {
                new()
                {
                    TenantId = tenantId,
                    Type = "Labour",
                    Description = "First fix labour",
                    Quantity = 1,
                    UnitPrice = 100,
                    VatRate = 20
                }
            }
        };
    }

    private static User BuildUser(
        int id,
        string email,
        string role,
        int tenantId,
        string plan,
        bool canManageAccounts = false,
        bool canManageSubscriptions = false)
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
            CanManageSubscriptions = canManageSubscriptions,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static HttpContext HttpContextForEmail(string email)
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

    private static IReadOnlyList<string> Validate(object request)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true);

        return results.Select(result => result.ErrorMessage ?? string.Empty).ToList();
    }
}
