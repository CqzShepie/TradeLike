using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TradeLike.Api;
using TradeLike.Api.Api.Payments;
using TradeLike.Api.Api.RoutePlanner;
using TradeLike.Api.Contracts.Admin;
using TradeLike.Api.Contracts.Jobs;
using TradeLike.Api.Contracts.Settings;
using TradeLike.Api.Controllers;
using TradeLike.Api.Data;
using TradeLike.Api.Inventory;
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
    public async Task ReportsSummaryWorksWithEmptyTenantData()
    {
        await using var context = CreateContext();
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

        Assert.Equal(0, summary.JobsCompleted);
        Assert.Equal(0, summary.JobsScheduled);
        Assert.Equal(0, summary.OpenJobs);
    }

    [Fact]
    public async Task ReportsJobsEndpointGroupsInMemoryWithoutTranslationFailure()
    {
        await using var context = CreateContext();
        var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 10);
        context.Jobs.AddRange(
            BuildJob(1, 1, "Scheduled", thisMonth),
            BuildJob(2, 1, "Scheduled", thisMonth),
            BuildJob(3, 1, "Completed", thisMonth));
        await context.SaveChangesAsync();

        var controller = new ReportsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Director)
            }
        };

        var result = await controller.GetJobs();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var rows = Assert.IsAssignableFrom<IReadOnlyList<JobReportRow>>(ok.Value);

        Assert.Contains(rows, row => row.Status == "Scheduled" && row.Count == 2);
        Assert.Contains(rows, row => row.Status == "Completed" && row.Count == 1);
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
    public async Task TeamPlanGuardAllowsBusinessAndEnterpriseButBlocksSolo()
    {
        await using var soloContext = CreateContext();
        await SeedSubscriptionAsync(soloContext, 1, "Solo", 1);
        var soloResult = await RunPlanGuardAsync(soloContext, Feature.TeamManagement, 1);
        var soloBlocked = Assert.IsType<ObjectResult>(soloResult);
        Assert.Equal(StatusCodes.Status402PaymentRequired, soloBlocked.StatusCode);

        await using var businessContext = CreateContext();
        await SeedSubscriptionAsync(businessContext, 1, "Business", 3);
        var businessResult = await RunPlanGuardAsync(businessContext, Feature.TeamManagement, 1);
        Assert.Null(businessResult);

        await using var enterpriseContext = CreateContext();
        await SeedSubscriptionAsync(enterpriseContext, 1, "Enterprise", 4);
        var enterpriseResult = await RunPlanGuardAsync(enterpriseContext, Feature.TeamManagement, 1);
        Assert.Null(enterpriseResult);
    }

    [Fact]
    public async Task InventoryPlanGuardAllowsBusinessAndEnterpriseButBlocksSolo()
    {
        Assert.Contains(
            typeof(InventoryController).GetCustomAttributes(typeof(PlanGuardAttribute), inherit: true).Cast<PlanGuardAttribute>(),
            attribute => attribute is not null);

        await using var soloContext = CreateContext();
        await SeedSubscriptionAsync(soloContext, 1, "Solo", 1);
        var soloResult = await RunPlanGuardAsync(soloContext, Feature.Inventory, 1);
        var soloBlocked = Assert.IsType<ObjectResult>(soloResult);
        Assert.Equal(StatusCodes.Status402PaymentRequired, soloBlocked.StatusCode);

        await using var businessContext = CreateContext();
        await SeedSubscriptionAsync(businessContext, 1, "Business", 3);
        var businessResult = await RunPlanGuardAsync(businessContext, Feature.Inventory, 1);
        Assert.Null(businessResult);

        await using var enterpriseContext = CreateContext();
        await SeedSubscriptionAsync(enterpriseContext, 1, "Enterprise", 4);
        var enterpriseResult = await RunPlanGuardAsync(enterpriseContext, Feature.Inventory, 1);
        Assert.Null(enterpriseResult);
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
    public async Task GetSettingsReturnsTenantScopedSettings()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            BuildUser(1, "owner-one@example.com", CustomerRoles.Director, 1, "Business"),
            BuildUser(2, "owner-two@example.com", CustomerRoles.Director, 2, "Business"));
        context.BusinessSettings.AddRange(
            new BusinessSettings
            {
                Id = 1,
                TenantId = 1,
                BusinessName = "Tenant One",
                QuotePrefix = "Q1",
                InvoicePrefix = "I1",
                DefaultJobPriority = "High",
                DefaultScheduleView = "Week",
                DefaultReportRange = "30d",
                LowStockThreshold = 4,
                PurchaseOrderPrefix = "PO1"
            },
            new BusinessSettings
            {
                Id = 2,
                TenantId = 2,
                BusinessName = "Tenant Two",
                QuotePrefix = "Q2",
                InvoicePrefix = "I2",
                DefaultJobPriority = "Low",
                DefaultScheduleView = "Day",
                DefaultReportRange = "90d",
                LowStockThreshold = 8,
                PurchaseOrderPrefix = "PO2"
            });
        await SeedSubscriptionRowAsync(context, 1, "Business", 10, 10);
        await SeedSubscriptionRowAsync(context, 2, "Business", 11, 10);

        var controller = new SettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var result = await controller.Get();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<CustomerSettingsResponse>(ok.Value);

        Assert.Equal("Tenant One", payload.BusinessProfile.BusinessName);
        Assert.Equal(1, payload.BusinessProfile.TenantId);
        Assert.DoesNotContain(payload.TeamMembers, member => member.Email == "owner-two@example.com");
    }

    [Fact]
    public async Task UpdateAccountSavesOnlyCurrentTenant()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            BuildUser(1, "owner-one@example.com", CustomerRoles.Director, 1, "Team"),
            BuildUser(2, "manager-one@example.com", CustomerRoles.Manager, 1, "Team"),
            BuildUser(3, "owner-two@example.com", CustomerRoles.Director, 2, "Team"));
        await context.SaveChangesAsync();

        var controller = new SettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var result = await controller.UpdateAccount(new UpdateAccountSettingsRequest(
            "Alex",
            "Owner",
            "Tenant One Updated",
            "Alex Owner",
            "07123456789"));

        Assert.IsType<OkObjectResult>(result.Result);
        var tenantOneUsers = await context.Users.Where(user => user.TenantId == 1).ToListAsync();
        var tenantTwoUser = await context.Users.SingleAsync(user => user.TenantId == 2);

        Assert.All(tenantOneUsers, user => Assert.Equal("Tenant One Updated", user.BusinessName));
        Assert.Equal("Alex Owner", tenantOneUsers[0].OwnerName);
        Assert.Null(tenantTwoUser.BusinessName);
        Assert.Null(tenantTwoUser.OwnerName);
    }

    [Fact]
    public async Task UpdateBusinessProfileSavesCorrectly()
    {
        await using var context = CreateContext();
        var owner = BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Business");
        context.Users.Add(owner);
        await SeedSubscriptionRowAsync(context, 1, "Business", 1, 10);
        await context.SaveChangesAsync();

        var controller = new SettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var result = await controller.UpdateBusinessProfile(new UpdateBusinessProfileSettingsRequest(
            "Acme Heating",
            "Acme Heating Ltd",
            "Alex Owner",
            "07123456789",
            "02070000000",
            "office@acme.test",
            "1 Trade Street",
            null,
            "London",
            null,
            "E1 1AA",
            "United Kingdom",
            "https://acme.test",
            "GB123",
            "12345678"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<BusinessSettingsResponse>(ok.Value);

        Assert.Equal("Acme Heating", payload.BusinessName);
        Assert.Equal("office@acme.test", payload.Email);
        Assert.Equal("12345678", payload.CompanyNumber);
        Assert.Equal("Alex Owner", owner.OwnerName);
    }

    [Fact]
    public async Task CustomerSettingsUpdatesPreserveSystemDocumentAndPurchaseOrderPrefixes()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Business"));
        context.BusinessSettings.Add(new BusinessSettings
        {
            TenantId = 1,
            BusinessName = "Acme Heating",
            QuotePrefix = "Q",
            InvoicePrefix = "INV",
            DefaultVatRate = 20m,
            QuoteExpiryDays = 30,
            DefaultJobPriority = "Normal",
            DefaultScheduleView = "Week",
            DefaultReportRange = "30d",
            LowStockThreshold = 5,
            PurchaseOrderPrefix = "PO"
        });
        await SeedSubscriptionRowAsync(context, 1, "Business", 1, 10);
        await context.SaveChangesAsync();

        var controller = new SettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var documentResult = await controller.UpdateDocumentDefaults(new UpdateDocumentDefaultsSettingsRequest(
            20m,
            "CUSTOMQ",
            "CUSTOMINV",
            30,
            "14 days",
            null,
            null,
            null,
            null));
        var inventoryResult = await controller.UpdateInventoryDefaults(new UpdateInventoryDefaultsSettingsRequest(
            8,
            "CUSTOMPO"));

        Assert.IsType<OkObjectResult>(documentResult.Result);
        Assert.IsType<OkObjectResult>(inventoryResult.Result);

        var settings = await context.BusinessSettings.SingleAsync(setting => setting.TenantId == 1);
        Assert.Equal("Q", settings.QuotePrefix);
        Assert.Equal("INV", settings.InvoicePrefix);
        Assert.Equal("PO", settings.PurchaseOrderPrefix);
        Assert.Equal(8, settings.LowStockThreshold);
    }

    [Fact]
    public async Task BusinessSettingsUpdatePreservesSystemPrefixes()
    {
        await using var context = CreateContext();
        context.BusinessSettings.Add(new BusinessSettings
        {
            TenantId = 1,
            BusinessName = "Acme Heating",
            QuotePrefix = "Q",
            InvoicePrefix = "INV",
            DefaultVatRate = 20m,
            QuoteExpiryDays = 30,
            DefaultJobPriority = "Normal",
            DefaultScheduleView = "Week",
            DefaultReportRange = "30d",
            LowStockThreshold = 5,
            PurchaseOrderPrefix = "PO"
        });
        await context.SaveChangesAsync();

        var controller = new BusinessSettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Director)
            }
        };

        var result = await controller.Update(new UpdateBusinessSettingsRequest(
            "Acme Heating",
            "Acme Heating Ltd",
            null,
            "1 Trade Street",
            null,
            "London",
            null,
            "E1 1AA",
            "United Kingdom",
            "02070000000",
            "office@acme.test",
            "https://acme.test",
            "GB123",
            "12345678",
            20m,
            "CUSTOMQ",
            "CUSTOMINV",
            "14 days",
            30,
            null,
            null,
            null,
            "Normal",
            "Week",
            "30d",
            true,
            false,
            8,
            "CUSTOMPO",
            null,
            null,
            null,
            null,
            null));

        Assert.IsType<OkObjectResult>(result.Result);

        var settings = await context.BusinessSettings.SingleAsync(setting => setting.TenantId == 1);
        Assert.Equal("Q", settings.QuotePrefix);
        Assert.Equal("INV", settings.InvoicePrefix);
        Assert.Equal("PO", settings.PurchaseOrderPrefix);
        Assert.Equal(8, settings.LowStockThreshold);
    }

    [Fact]
    public async Task BillingPlanChangeRequiresConfirmation()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Solo"));
        await SeedSubscriptionRowAsync(context, 1, "Solo", 1, 1);

        var controller = new BillingController(
            context,
            new ConfigurationBuilder().Build(),
            NullLogger<BillingController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var result = await controller.RequestPlanChange(new BillingPlanChangeRequest("Team", false), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task BillingPlanChangeKeepsUserAndSubscriptionPlanConsistent()
    {
        await using var context = CreateContext();
        context.Plans.AddRange(
            new Plan { Id = 1, Name = "Solo", MonthlyPricePence = 3500, MaxIncludedUsers = 1 },
            new Plan { Id = 2, Name = "Team", MonthlyPricePence = 7500, MaxIncludedUsers = 10 });
        context.Users.Add(BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Solo"));
        context.Subscriptions.Add(new Subscription
        {
            TenantId = 1,
            PlanId = 1,
            SeatsPurchased = 1,
            BillingStartUtc = DateTime.UtcNow.AddDays(-14),
            NextInvoiceDateUtc = DateTime.UtcNow.AddDays(14),
            Status = "Active"
        });
        await context.SaveChangesAsync();

        var controller = new BillingController(
            context,
            new ConfigurationBuilder().Build(),
            NullLogger<BillingController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var result = await controller.RequestPlanChange(new BillingPlanChangeRequest("Team", true), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<BillingPlanChangeResponse>(ok.Value);
        var user = await context.Users.SingleAsync(existingUser => existingUser.Id == 1);
        var subscription = await context.Subscriptions.SingleAsync(existingSubscription => existingSubscription.TenantId == 1);

        Assert.Equal("Team", payload.PlanName);
        Assert.Equal("Team", user.SubscriptionPlan);
        Assert.Equal(2, subscription.PlanId);
        Assert.Equal(2, subscription.SeatsPurchased);
        Assert.Contains(await context.AdminAuditLogs.ToListAsync(), log => log.Action == "Billing plan change request");
    }

    [Fact]
    public async Task TeamMemberListExcludesInternalStaff()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Team"),
            BuildUser(2, "manager@example.com", CustomerRoles.Manager, 1, "Team"),
            BuildUser(3, "staff@example.com", CustomerRoles.LegacyDirector, 1, "Internal"));
        await SeedSubscriptionRowAsync(context, 1, "Team", 1, 5);
        await context.SaveChangesAsync();

        var controller = new SettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var result = await controller.GetTeam();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var team = Assert.IsAssignableFrom<IReadOnlyList<CustomerSettingsTeamMemberResponse>>(ok.Value);

        Assert.Equal(2, team.Count);
        Assert.DoesNotContain(team, member => member.Email == "staff@example.com");
    }

    [Fact]
    public async Task CustomerCannotAssignInternalStaffRole()
    {
        await using var context = CreateContext();
        context.Users.AddRange(
            BuildUser(1, "owner@example.com", CustomerRoles.Director, 1, "Team"),
            BuildUser(2, "member@example.com", CustomerRoles.Employee, 1, "Team"));
        await context.SaveChangesAsync();

        var controller = new SettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Director)
            }
        };

        var result = await controller.UpdateTeamMember(
            2,
            new UpdateCustomerSettingsTeamMemberRequest("Director", "Active"));

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("CustomerEmployee", (await context.Users.SingleAsync(user => user.Id == 2)).Role);
        Assert.Contains("CustomerManager or CustomerEmployee", badRequest.Value!.ToString());
    }

    [Fact]
    public async Task JobAssignmentRejectsNonTenantOrInternalStaff()
    {
        await using var context = CreateContext();
        context.Jobs.Add(new Job
        {
            Id = 10,
            TenantId = 1,
            Customer = "Customer",
            Phone = "07123456789",
            JobTitle = "Boiler service",
            Address = "1 Trade Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal"
        });
        context.Users.Add(BuildUser(99, "studio@example.com", CustomerRoles.LegacyDirector, 1, "Internal"));
        context.CustomerStaffMembers.Add(new CustomerStaffMember
        {
            Id = 20,
            CompanyUserId = 2,
            FirstName = "Other",
            LastName = "Tenant",
            Email = "other@example.com",
            Phone = "07123456789",
            RoleName = "Engineer",
            Status = "Active",
            PermissionPresetName = "Engineer",
            Skills = string.Empty,
            ServiceArea = string.Empty,
            WorkingHours = string.Empty,
            CalendarColour = "blue"
        });
        await context.SaveChangesAsync();

        var controller = new JobAssignmentsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Manager)
            }
        };

        var internalStaffResult = await controller.UpdateAssignment(
            10,
            new UpdateJobAssignmentRequest(null, 99, [], null, "blue"));
        var otherTenantResult = await controller.UpdateAssignment(
            10,
            new UpdateJobAssignmentRequest(null, 20, [], null, "blue"));

        Assert.IsType<NotFoundResult>(internalStaffResult.Result);
        Assert.IsType<NotFoundResult>(otherTenantResult.Result);
    }

    [Fact]
    public async Task JobAssignmentCanAssignChangeAndUnassignTenantStaff()
    {
        await using var context = CreateContext();
        context.Jobs.Add(new Job
        {
            Id = 11,
            TenantId = 1,
            Customer = "Customer",
            Phone = "07123456789",
            JobTitle = "Boiler service",
            Address = "1 Trade Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal"
        });
        context.CustomerStaffMembers.AddRange(
            BuildStaffMember(30, 1, "Amy"),
            BuildStaffMember(31, 1, "Ben"));
        await context.SaveChangesAsync();

        var controller = new JobAssignmentsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Manager)
            }
        };

        var assigned = await controller.UpdateAssignment(11, new UpdateJobAssignmentRequest(null, 30, [31], null, "blue"));
        var changed = await controller.UpdateAssignment(11, new UpdateJobAssignmentRequest(null, 31, [], null, "blue"));
        var unassigned = await controller.UpdateAssignment(11, new UpdateJobAssignmentRequest(null, null, [], null, "blue"));

        Assert.IsType<OkObjectResult>(assigned.Result);
        Assert.IsType<OkObjectResult>(changed.Result);
        var ok = Assert.IsType<OkObjectResult>(unassigned.Result);
        var rows = Assert.IsAssignableFrom<IReadOnlyList<JobAssignmentResponse>>(ok.Value);
        var row = Assert.Single(rows);
        Assert.Null(row.LeadStaffMemberId);
        Assert.Empty(row.AssignedStaffMemberIds);
    }

    [Fact]
    public async Task JobAssignmentClearEndpointClearsAssignmentWithoutDeletingJob()
    {
        await using var context = CreateContext();
        context.Jobs.Add(new Job
        {
            Id = 12,
            TenantId = 1,
            Customer = "Customer",
            Phone = "07123456789",
            JobTitle = "Boiler service",
            Address = "1 Trade Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal",
            AssignedTeamId = 70,
            LeadStaffMemberId = 30,
            EngineerId = 99,
            CalendarColour = "green"
        });
        context.CustomerStaffTeams.Add(new CustomerStaffTeam
        {
            Id = 70,
            CompanyUserId = 1,
            Name = "Install team",
            Description = "",
            Colour = "green",
            DefaultJobType = "",
            ServiceArea = "",
            WorkingHours = ""
        });
        context.CustomerStaffMembers.AddRange(
            BuildStaffMember(30, 1, "Amy"),
            BuildStaffMember(31, 1, "Ben"));
        context.JobAssignments.Add(new JobAssignment
        {
            JobId = 12,
            TenantId = 1,
            LeadStaffMemberId = 30,
            StaffMembers = [new JobAssignmentStaff { StaffMemberId = 31 }]
        });
        await context.SaveChangesAsync();

        var controller = new JobAssignmentsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Manager)
            }
        };

        var cleared = await controller.ClearAssignment(12);
        var clearedAgain = await controller.ClearAssignment(12);

        Assert.IsType<OkObjectResult>(cleared.Result);
        Assert.IsType<OkObjectResult>(clearedAgain.Result);

        var job = await context.Jobs.SingleAsync(existingJob => existingJob.Id == 12);
        Assert.Null(job.AssignedTeamId);
        Assert.Null(job.LeadStaffMemberId);
        Assert.Null(job.EngineerId);
        Assert.Equal("Scheduled", job.Status);

        var assignment = await context.JobAssignments
            .Include(existingAssignment => existingAssignment.StaffMembers)
            .SingleAsync(existingAssignment => existingAssignment.JobId == 12);
        Assert.Null(assignment.LeadStaffMemberId);
        Assert.Empty(assignment.StaffMembers);
    }

    [Fact]
    public async Task JobAssignmentClearEndpointIsTenantScoped()
    {
        await using var context = CreateContext();
        context.Jobs.Add(new Job
        {
            Id = 13,
            TenantId = 2,
            Customer = "Other Tenant",
            Phone = "07123456789",
            JobTitle = "Boiler service",
            Address = "1 Other Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal",
            AssignedTeamId = 70,
            LeadStaffMemberId = 30
        });
        await context.SaveChangesAsync();

        var controller = new JobAssignmentsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForTenant(1, CustomerRoles.Manager)
            }
        };

        var result = await controller.ClearAssignment(13);

        Assert.IsType<NotFoundResult>(result.Result);
        var job = await context.Jobs.SingleAsync(existingJob => existingJob.Id == 13);
        Assert.Equal(70, job.AssignedTeamId);
        Assert.Equal(30, job.LeadStaffMemberId);
    }

    [Fact]
    public async Task StaffLeaveIsTenantScopedAndRecordsDecision()
    {
        await using var context = CreateContext();
        context.CustomerStaffMembers.AddRange(
            BuildStaffMember(40, 1, "Tenant"),
            BuildStaffMember(41, 2, "Other"));
        await context.SaveChangesAsync();

        var controller = new StaffLeaveRequestsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 7, CustomerRoles.Manager)
            }
        };

        var invalidCreate = await controller.CreateLeaveRequest(new CreateStaffLeaveRequest(
            41,
            DateTime.Today.AddDays(7),
            DateTime.Today.AddDays(8),
            "Holiday",
            "Paid"));
        var created = await controller.CreateLeaveRequest(new CreateStaffLeaveRequest(
            40,
            DateTime.Today.AddDays(7),
            DateTime.Today.AddDays(8),
            "Holiday",
            "Unpaid"));

        Assert.IsType<BadRequestObjectResult>(invalidCreate.Result);
        var createdResult = Assert.IsType<CreatedAtActionResult>(created.Result);
        var createdLeave = Assert.IsType<StaffLeaveRequestResponse>(createdResult.Value);

        var approved = await controller.ApproveLeaveRequest(createdLeave.Id, new LeaveDecisionRequest("Approved by manager"));
        var ok = Assert.IsType<OkObjectResult>(approved.Result);
        var response = Assert.IsType<StaffLeaveRequestResponse>(ok.Value);

        Assert.Equal("Approved", response.Status);
        Assert.Equal("Unpaid", response.LeaveType);
        Assert.Equal("Approved by manager", response.DecisionNote);
        Assert.Equal(7, response.DecidedByUserId);
        Assert.NotNull(response.DecidedAt);
    }

    [Fact]
    public async Task EmployeeCannotUpdateRestrictedBusinessProfileSettings()
    {
        await using var context = CreateContext();
        context.Users.Add(BuildUser(1, "employee@example.com", CustomerRoles.Employee, 1, "Solo"));
        await context.SaveChangesAsync();

        var controller = new SettingsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = HttpContextForUser(1, 1, CustomerRoles.Employee)
            }
        };

        var result = await controller.UpdateBusinessProfile(new UpdateBusinessProfileSettingsRequest(
            "Blocked",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null));

        var forbidden = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidden.StatusCode);
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

    private static CustomerStaffMember BuildStaffMember(int id, int tenantId, string firstName)
    {
        return new CustomerStaffMember
        {
            Id = id,
            CompanyUserId = tenantId,
            FirstName = firstName,
            LastName = "Engineer",
            Email = $"{firstName.ToLowerInvariant()}-{tenantId}@example.com",
            Phone = "07123456789",
            RoleName = "Engineer",
            Status = "Active",
            PermissionPresetName = "Engineer",
            Skills = string.Empty,
            ServiceArea = string.Empty,
            WorkingHours = string.Empty,
            CalendarColour = "blue",
            CreatedAt = DateTime.UtcNow
        };
    }

    private static async Task SeedSubscriptionAsync(
        TradeLikeDbContext context,
        int tenantId,
        string planName,
        int planId)
    {
        context.Plans.Add(new Plan
        {
            Id = planId,
            Name = planName,
            MonthlyPricePence = planName == "Enterprise" ? null : 7500,
            MaxIncludedUsers = planName == "Enterprise" ? null : 10,
            CreatedAt = DateTime.UtcNow
        });
        context.Users.Add(BuildUser(tenantId, $"owner-{tenantId}@example.com", CustomerRoles.Director, tenantId, planName));
        context.Subscriptions.Add(new Subscription
        {
            TenantId = tenantId,
            PlanId = planId,
            SeatsPurchased = planName == "Solo" ? 1 : 10,
            BillingStartUtc = DateTime.UtcNow,
            NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1),
            Status = "Active"
        });
        await context.SaveChangesAsync();
    }

    private static async Task SeedSubscriptionRowAsync(
        TradeLikeDbContext context,
        int tenantId,
        string planName,
        int planId,
        int seatsPurchased)
    {
        if (!await context.Plans.AnyAsync(plan => plan.Id == planId))
        {
            context.Plans.Add(new Plan
            {
                Id = planId,
                Name = planName,
                MonthlyPricePence = planName == "Enterprise" ? null : 7500,
                MaxIncludedUsers = planName == "Enterprise" ? null : 10,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!await context.Subscriptions.AnyAsync(subscription => subscription.TenantId == tenantId))
        {
            context.Subscriptions.Add(new Subscription
            {
                TenantId = tenantId,
                PlanId = planId,
                SeatsPurchased = seatsPurchased,
                BillingStartUtc = DateTime.UtcNow,
                NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1),
                Status = "Active"
            });
        }

        await context.SaveChangesAsync();
    }

    private static async Task<IActionResult?> RunPlanGuardAsync(
        TradeLikeDbContext context,
        Feature feature,
        int tenantId)
    {
        var services = new ServiceCollection()
            .AddSingleton(context)
            .BuildServiceProvider();
        var httpContext = HttpContextForTenant(tenantId, CustomerRoles.Director);
        httpContext.RequestServices = services;
        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ControllerActionDescriptor());
        var executingContext = new ActionExecutingContext(
            actionContext,
            [],
            new Dictionary<string, object?>(),
            controller: null!);
        var guard = new PlanGuardAttribute(feature);

        await guard.OnActionExecutionAsync(
            executingContext,
            () => Task.FromResult(new ActionExecutedContext(actionContext, [], controller: null!)));

        return executingContext.Result;
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

    private static HttpContext HttpContextForUser(int tenantId, int userId, string role)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim("tid", tenantId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
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
