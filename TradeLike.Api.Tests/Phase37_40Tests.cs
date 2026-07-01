using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Api.Companies;
using TradeLike.Api.Api.Dashboards;
using TradeLike.Api.Api.Webhooks;
using TradeLike.Api.Api.Workflows;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class Phase37_40Tests
{
    [Fact]
    public async Task InvalidDiagramReturns400()
    {
        await using var context = CreateContext();
        var controller = new WorkflowDiagramController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = HttpContextForTenant(1, CustomerRoles.Manager) }
        };

        var result = await controller.SaveDiagram(
            1,
            new WorkflowDiagramRequest(
                [
                    new WorkflowDiagramNode("trigger", "Trigger", JsonSerializer.SerializeToElement(new { })),
                    new WorkflowDiagramNode("action", "Action", JsonSerializer.SerializeToElement(new { }))
                ],
                []),
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task RunEndpointReturnsRevenueForKpiWidget()
    {
        await using var context = CreateContext();
        context.Plans.Add(new Plan { Id = 3, Name = "Business", CreatedAt = DateTime.UtcNow });
        context.Subscriptions.Add(new Subscription
        {
            TenantId = 1,
            PlanId = 3,
            SeatsPurchased = 5,
            BillingStartUtc = DateTime.UtcNow,
            NextInvoiceDateUtc = DateTime.UtcNow.AddMonths(1),
            Status = "Active"
        });
        context.Dashboards.Add(new Dashboard
        {
            Id = 10,
            TenantId = 1,
            Name = "Revenue",
            LayoutJson = "[]",
            CreatedById = 1,
            Widgets =
            [
                new DashboardWidget
                {
                    Id = 20,
                    Type = DashboardWidgetType.KPI,
                    QueryJson = "{\"metric\":\"revenue\"}",
                    PositionJson = "{}"
                }
            ]
        });
        context.Invoices.Add(new Invoice
        {
            TenantId = 1,
            InvoiceNumber = "INV-1",
            CustomerName = "Customer",
            Title = "Invoice",
            Status = "Paid",
            TotalPence = 12345
        });
        await context.SaveChangesAsync();

        var controller = new DashboardsController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = HttpContextForTenant(1, CustomerRoles.Manager) }
        };

        var result = await controller.Run(10, CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result);
        var json = JsonSerializer.Serialize(ok.Value);

        Assert.Contains("123.45", json);
    }

    [Fact]
    public async Task StaffInBranchBCannotAccessJobsInBranchA()
    {
        await using var context = CreateContext();
        context.Companies.AddRange(
            new Company { Id = 100, TenantId = 1, Name = "Branch A", Type = "Branch" },
            new Company { Id = 200, TenantId = 1, Name = "Branch B", Type = "Branch" });
        context.CompanyUsers.Add(new CompanyUser { CompanyId = 200, UserId = 7, Role = CompanyRole.Staff });
        var job = new Job
        {
            TenantId = 1,
            Customer = "A",
            Phone = "07123456789",
            JobTitle = "Repair",
            Address = "1 A Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal"
        };
        context.Jobs.Add(job);
        context.Entry(job).Property("CompanyId").CurrentValue = 100;
        await context.SaveChangesAsync();

        var allowed = await CompanyAccess.CanAccessJobAsync(
            context,
            HttpContextForTenant(1, CustomerRoles.Employee, 7).User,
            job,
            CancellationToken.None);

        Assert.False(allowed);
    }

    [Fact]
    public void FilterStatusPaidOnlyFiresOnPaidInvoices()
    {
        const string filter = "{\"field\":\"status\",\"operator\":\"==\",\"value\":\"Paid\"}";
        using var paid = JsonDocument.Parse("{\"status\":\"Paid\"}");
        using var draft = JsonDocument.Parse("{\"status\":\"Draft\"}");

        Assert.True(WebhookWorkflowEngine.Matches(filter, paid.RootElement));
        Assert.False(WebhookWorkflowEngine.Matches(filter, draft.RootElement));
    }

    private static TradeLikeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TradeLikeDbContext(options);
    }

    private static HttpContext HttpContextForTenant(int tenantId, string role, int userId = 1)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim("tid", tenantId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role)
            ],
            "Test");

        return new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity)
        };
    }
}
