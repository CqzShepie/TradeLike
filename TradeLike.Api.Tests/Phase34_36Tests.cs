using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Api.Export;
using TradeLike.Api.Api.Integrations;
using TradeLike.Api.Api.Templates;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class Phase34_36Tests
{
    [Fact]
    public void TemplateRender_ResolvesPlaceholders()
    {
        using var context = CreateContext();
        var engine = new TemplateEngine(context);
        var html = engine.Render(
            "<h1>{{Quote.Title}}</h1><p>{{Quote.CustomerName}}</p>",
            new Dictionary<string, object?>
            {
                ["Quote"] = new Quote { Title = "Boiler service", CustomerName = "Avery Homes" }
            });

        Assert.Contains("Boiler service", html);
        Assert.Contains("Avery Homes", html);
        Assert.DoesNotContain("{{", html);
    }

    [Fact]
    public async Task ExpiredTokenRefreshPath_IsCalled()
    {
        using var context = CreateContext();
        context.AccountingTokens.Add(new AccountingToken
        {
            TenantId = 10,
            Provider = AccountingProvider.Xero,
            AccessToken = "old-access",
            RefreshToken = "old-refresh",
            ExpiresUtc = DateTime.UtcNow.AddMinutes(-1),
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1)
        });
        await context.SaveChangesAsync();

        var client = new PlaceholderAccountingProviderClient();
        var service = new AccountingIntegrationService(context, client);
        var token = await service.EnsureFreshTokenAsync(10, AccountingProvider.Xero, CancellationToken.None);

        Assert.NotNull(token);
        Assert.Equal(1, client.RefreshCallCount);
        Assert.NotEqual("old-access", token!.AccessToken);
    }

    [Fact]
    public async Task BusinessPlan_SecondExportInside24Hours_Returns429()
    {
        using var context = CreateContext();
        context.FullDataExportLogs.Add(new FullDataExportLog
        {
            TenantId = 7,
            RequestedById = 2,
            PlanName = "Business",
            CreatedAtUtc = DateTime.UtcNow.AddHours(-2)
        });
        await context.SaveChangesAsync();

        var result = await FullExportRateLimiter.EvaluateAsync(
            context,
            7,
            "Business",
            DateTime.UtcNow,
            CancellationToken.None);

        Assert.False(result.Allowed);
        Assert.Equal(429, result.StatusCode);
    }

    private static TradeLikeDbContext CreateContext()
    {
        return new TradeLikeDbContext(new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);
    }
}
