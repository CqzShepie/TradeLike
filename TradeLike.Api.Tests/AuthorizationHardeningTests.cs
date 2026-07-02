using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using TradeLike.Api;
using TradeLike.Api.Api.Payments;
using TradeLike.Api.Api.RoutePlanner;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Contracts.Jobs;
using TradeLike.Api.Controllers;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class AuthorizationHardeningTests
{
    [Fact]
    public void CustomerRolesDoNotElevateLegacyRolesAtRuntime()
    {
        Assert.Equal(CustomerRoles.LegacyDirector, CustomerRoles.Normalize("Director"));
        Assert.Equal(CustomerRoles.LegacyCustomer, CustomerRoles.Normalize("Customer"));
        Assert.False(CustomerRoles.IsDirector("Director"));
        Assert.False(CustomerRoles.IsCustomerRole("Customer"));
        Assert.False(CustomerRoles.IsCustomerRole("Director"));
        Assert.True(CustomerRoles.IsCustomerRole(CustomerRoles.Director));
        Assert.True(CustomerRoles.IsStudioRole("Director"));
        Assert.False(CustomerRoles.IsStudioRole(CustomerRoles.Director));
    }

    [Fact]
    public void CustomerRolesAcceptOnlyCanonicalCustomerRoles()
    {
        Assert.True(CustomerRoles.IsCustomerRole(CustomerRoles.Employee));
        Assert.True(CustomerRoles.IsCustomerRole(CustomerRoles.Manager));
        Assert.True(CustomerRoles.IsCustomerRole(CustomerRoles.Director));
        Assert.False(CustomerRoles.IsCustomerRole("Customer"));
        Assert.False(CustomerRoles.IsCustomerRole("Director"));
        Assert.False(CustomerRoles.IsCustomerRole("Admin"));
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
    public async Task TenantJobNumbersStartAtOnePerTenant()
    {
        await using var context = CreateContext();
        var service = new JobService(context);

        var tenantOneJob = await service.CreateAsync(BuildCreateJobRequest("Tenant one job"), 1);
        var tenantTwoJob = await service.CreateAsync(BuildCreateJobRequest("Tenant two job"), 2);
        var tenantOneSecondJob = await service.CreateAsync(BuildCreateJobRequest("Tenant one second job"), 1);

        Assert.NotEqual(tenantOneJob.Id, tenantTwoJob.Id);
        Assert.Equal(1, tenantOneJob.JobNumber);
        Assert.Equal(1, tenantTwoJob.JobNumber);
        Assert.Equal(2, tenantOneSecondJob.JobNumber);
    }

    [Fact]
    public async Task ReportsSummaryCountsOnlyCallerTenantJobs()
    {
        await using var context = CreateContext();
        var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 10);
        context.Jobs.AddRange(
            BuildJob(1, 1, "Completed", thisMonth),
            BuildJob(2, 2, "Completed", thisMonth),
            BuildJob(3, 1, "Scheduled", thisMonth));
        await context.SaveChangesAsync();

        var controller = new ReportsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Director)
            }
        };

        var result = await controller.GetSummary();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var summary = Assert.IsType<ReportsSummaryResponse>(ok.Value);

        Assert.Equal(1, summary.JobsCompleted);
        Assert.Equal(2, summary.JobsScheduled);
    }

    [Fact]
    public async Task BusinessReportRequiresBusinessOrEnterprisePlan()
    {
        await using var context = CreateContext();
        context.Plans.AddRange(
            new Plan { Id = 1, Name = "Solo", MonthlyPricePence = 3500, MaxIncludedUsers = 1, CreatedAt = DateTime.UtcNow },
            new Plan { Id = 4, Name = "Enterprise", CreatedAt = DateTime.UtcNow });
        context.Users.Add(BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Solo"));
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

        var controller = new ReportsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Director)
            }
        };

        var soloResult = await controller.GetBusiness();
        var blocked = Assert.IsType<ObjectResult>(soloResult.Result);
        Assert.Equal(StatusCodes.Status402PaymentRequired, blocked.StatusCode);

        var subscription = await context.Subscriptions.SingleAsync();
        subscription.PlanId = 4;
        await context.SaveChangesAsync();

        var enterpriseResult = await controller.GetBusiness();
        Assert.IsType<OkObjectResult>(enterpriseResult.Result);
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
    public async Task ForgotPasswordStoresHashedTokenAndGenericDevelopmentLink()
    {
        await using var context = CreateContext();
        var user = BuildUser(
            id: 1,
            email: "owner@example.com",
            role: CustomerRoles.Director,
            tenantId: 1,
            plan: "Solo");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreatePasswordResetService(context, "Development");
        var httpContext = new DefaultHttpContext();

        var result = await service.RequestSelfServiceResetAsync("owner@example.com", httpContext);

        Assert.NotNull(result);
        Assert.NotNull(result!.DevelopmentResetLink);
        Assert.NotNull(user.PasswordResetTokenHash);
        var token = ExtractToken(result.DevelopmentResetLink!);
        Assert.NotEqual(token, user.PasswordResetTokenHash);
        Assert.Equal(PasswordResetService.HashToken(token), user.PasswordResetTokenHash);
        Assert.NotNull(user.PasswordResetRequestedAtUtc);
    }

    [Fact]
    public async Task ResetPasswordRejectsExpiredToken()
    {
        await using var context = CreateContext();
        var user = BuildUser(
            id: 1,
            email: "owner@example.com",
            role: CustomerRoles.Director,
            tenantId: 1,
            plan: "Solo");
        user.PasswordResetTokenHash = PasswordResetService.HashToken("expired-token");
        user.PasswordResetTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreatePasswordResetService(context, "Development");

        var result = await service.ResetPasswordAsync(
            "expired-token",
            "NewPassword123!",
            new DefaultHttpContext());

        Assert.Equal(PasswordResetResult.InvalidOrExpiredToken, result);
    }

    [Fact]
    public async Task ResetPasswordUpdatesHashAndClearsToken()
    {
        await using var context = CreateContext();
        var user = BuildUser(
            id: 1,
            email: "owner@example.com",
            role: CustomerRoles.Director,
            tenantId: 1,
            plan: "Solo");
        user.PasswordResetTokenHash = PasswordResetService.HashToken("valid-token");
        user.PasswordResetTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(30);
        user.PasswordResetRequestedAtUtc = DateTime.UtcNow;
        user.PasswordResetRequired = true;
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreatePasswordResetService(context, "Development");

        var result = await service.ResetPasswordAsync(
            "valid-token",
            "NewPassword123!",
            new DefaultHttpContext());

        Assert.Equal(PasswordResetResult.Success, result);
        Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword123!", user.PasswordHash));
        Assert.Null(user.PasswordResetTokenHash);
        Assert.Null(user.PasswordResetTokenExpiresAtUtc);
        Assert.Null(user.PasswordResetRequestedAtUtc);
        Assert.False(user.PasswordResetRequired);
    }

    [Fact]
    public async Task ProductionForgotPasswordDoesNotReturnResetLink()
    {
        await using var context = CreateContext();
        var user = BuildUser(
            id: 1,
            email: "owner@example.com",
            role: CustomerRoles.Director,
            tenantId: 1,
            plan: "Solo");
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = CreatePasswordResetService(context, "Production");

        var result = await service.RequestSelfServiceResetAsync(
            "owner@example.com",
            new DefaultHttpContext());

        Assert.NotNull(result);
        Assert.Null(result!.DevelopmentResetLink);
        Assert.NotNull(user.PasswordResetTokenHash);
    }

    [Fact]
    public async Task AdminCreateCustomerUsesSetupLinkInsteadOfStaffTypedPassword()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser(
            id: 1,
            email: "studio@example.com",
            role: "Director",
            tenantId: 1,
            plan: "Internal"));
        await context.SaveChangesAsync();

        var service = CreatePasswordResetService(context, "Development");
        var controller = new AdminUserController(context, service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForStudioUser("studio@example.com")
            }
        };

        var result = await controller.CreateUser(new CreateAdminUserRequest
        {
            FirstName = "Customer",
            LastName = "Owner",
            Email = "owner@example.com",
            Password = "StaffTyped123!",
            AccountStatus = "Trial",
            SubscriptionPlan = "Solo",
            BillingStatus = "Trial",
            HealthStatus = "Green"
        });

        Assert.IsType<OkObjectResult>(result.Result);
        var created = await context.Users.SingleAsync(user => user.Email == "owner@example.com");
        Assert.Equal(CustomerRoles.Director, created.Role);
        Assert.True(created.PasswordResetRequired);
        Assert.NotNull(created.PasswordResetTokenHash);
        Assert.False(BCrypt.Net.BCrypt.Verify("StaffTyped123!", created.PasswordHash));
        Assert.True(await context.AdminAuditLogs.AnyAsync(
            log => log.Action == "PasswordResetLinkSent" && log.TargetEmail == "owner@example.com"));
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

    private static CreateJobRequest BuildCreateJobRequest(string title)
    {
        return new CreateJobRequest
        {
            Customer = "Customer",
            Phone = "07123456789",
            JobTitle = title,
            Address = "1 Trade Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal"
        };
    }

    private static Job BuildJob(int id, int tenantId, string status, DateTime scheduledDate)
    {
        return new Job
        {
            Id = id,
            TenantId = tenantId,
            Customer = "Customer",
            Phone = "07123456789",
            JobTitle = "Job",
            Address = "1 Trade Street",
            ScheduledDate = scheduledDate,
            Status = status,
            Priority = "Normal"
        };
    }

    private static PasswordResetService CreatePasswordResetService(
        TradeLikeDbContext context,
        string environmentName)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Frontend:BaseUrl"] = "https://localhost:5173",
                ["Features:Notifications:Enabled"] = "false"
            })
            .Build();

        var queue = new NotificationQueue(
            new HttpClient(),
            configuration,
            NullLogger<NotificationQueue>.Instance);

        return new PasswordResetService(
            context,
            queue,
            configuration,
            new TestEnvironment(environmentName),
            NullLogger<PasswordResetService>.Instance);
    }

    private static string ExtractToken(string resetLink)
    {
        var uri = new Uri(resetLink);
        var query = uri.Query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .ToDictionary(part => part[0], part => Uri.UnescapeDataString(part[1]));

        return query["token"];
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

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public TestEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }

        public string ApplicationName { get; set; } = "TradeLike.Api.Tests";

        public string WebRootPath { get; set; } = string.Empty;

        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();

        public string ContentRootPath { get; set; } = string.Empty;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
