using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Customers;
using TradeLike.Api.Contracts.Pagination;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Services;
using Xunit;

namespace TradeLike.Api.Tests;

public sealed class DataIntegrityPaginationTests
{
    [Fact]
    public async Task CustomerPaginationReturnsRequestedPageMetadata()
    {
        await using var context = CreateContext();
        SeedCustomers(context, 1, 30);
        SeedCustomers(context, 2, 3);
        await context.SaveChangesAsync();

        var service = new CustomerService(context);
        var result = await service.GetPagedAsync(1, new PagedQuery
        {
            Page = 2,
            PageSize = 10,
            SortBy = "name"
        });

        Assert.Equal(2, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(30, result.TotalItems);
        Assert.Equal(3, result.TotalPages);
        Assert.Equal(10, result.Items.Count);
    }

    [Fact]
    public async Task CustomerPaginationClampsPageSizeToOneHundred()
    {
        await using var context = CreateContext();
        SeedCustomers(context, 1, 105);
        await context.SaveChangesAsync();

        var service = new CustomerService(context);
        var result = await service.GetPagedAsync(1, new PagedQuery
        {
            PageSize = 500
        });

        Assert.Equal(100, result.PageSize);
        Assert.Equal(100, result.Items.Count);
        Assert.Equal(105, result.TotalItems);
    }

    [Fact]
    public async Task CustomerSearchRemainsTenantScoped()
    {
        await using var context = CreateContext();
        context.Customers.AddRange(
            BuildCustomer(1, 1, "Alpha Heating", "alpha@example.com"),
            BuildCustomer(2, 1, "Beta Electrical", "beta@example.com"),
            BuildCustomer(3, 2, "Alpha Other Tenant", "alpha-other@example.com"));
        await context.SaveChangesAsync();

        var service = new CustomerService(context);
        var result = await service.GetPagedAsync(1, new PagedQuery
        {
            Search = "Alpha"
        });

        var customer = Assert.Single(result.Items);
        Assert.Equal(1, customer.TenantId);
        Assert.Equal("Alpha Heating", customer.Name);
    }

    [Fact]
    public async Task CustomerValidationRejectsOverlongFieldsAndBadEmail()
    {
        await using var context = CreateContext();
        var service = new CustomerService(context);

        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(new CreateCustomerRequest
        {
            Name = new string('A', 181),
            Email = "good@example.com",
            Phone = "07123456789",
            Address = "1 Main Street"
        }, 1));

        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(new CreateCustomerRequest
        {
            Name = "Bad Email",
            Email = "not-an-email",
            Phone = "07123456789",
            Address = "1 Main Street"
        }, 1));
    }

    [Fact]
    public async Task QuoteRejectsNegativeLineValues()
    {
        await using var context = CreateContext();
        SeedCustomer(context, 1);
        await context.SaveChangesAsync();

        var service = new QuoteService(context);

        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(
            BuildQuote(unitPrice: -1),
            1));
    }

    [Fact]
    public async Task AcceptedQuoteEditIsBlocked()
    {
        await using var context = CreateContext();
        SeedCustomer(context, 1);
        await context.SaveChangesAsync();

        var service = new QuoteService(context);
        var accepted = await service.CreateAsync(BuildQuote(status: "Accepted"), 1);

        await Assert.ThrowsAsync<ValidationException>(() => service.UpdateAsync(
            accepted.Id,
            BuildQuote(title: "Casual total edit"),
            1));
    }

    [Fact]
    public async Task ConvertedQuoteEditIsBlocked()
    {
        await using var context = CreateContext();
        SeedCustomer(context, 1);
        await context.SaveChangesAsync();

        var service = new QuoteService(context);
        var quote = await service.CreateAsync(BuildQuote(status: "Sent"), 1);

        context.Jobs.Add(new Job
        {
            TenantId = 1,
            Customer = "Customer 1",
            Phone = "07123456789",
            JobTitle = "Converted quote job",
            Address = "1 Main Street",
            ScheduledDate = DateTime.Today.AddDays(1),
            Status = "Scheduled",
            Priority = "Normal",
            QuoteId = quote.Id
        });
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<ValidationException>(() => service.UpdateAsync(
            quote.Id,
            BuildQuote(title: "Converted total edit"),
            1));
    }

    [Fact]
    public async Task PaidInvoiceFinancialEditIsBlocked()
    {
        await using var context = CreateContext();
        var invoice = new Invoice
        {
            TenantId = 1,
            InvoiceNumber = "INV-1",
            CustomerName = "Customer 1",
            Title = "Boiler work",
            TotalPence = 10000,
            Status = "Paid",
            DueDate = DateTime.Today.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            PaidAt = DateTime.UtcNow
        };

        context.Invoices.Add(invoice);
        await context.SaveChangesAsync();

        invoice.TotalPence = 11000;

        await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());
    }

    [Fact]
    public void RequestedIndexesAreConfigured()
    {
        using var context = CreateContext();

        AssertHasIndex<Customer>(context, "TenantId", "Name");
        AssertHasIndex<Customer>(context, "TenantId", "Email");
        AssertHasIndex<Job>(context, "TenantId", "ScheduledDate");
        AssertHasIndex<Job>(context, "TenantId", "Status");
        AssertHasIndex<Quote>(context, "TenantId", "CustomerId");
        AssertHasIndex<Quote>(context, "TenantId", "Status");
        AssertHasIndex<Invoice>(context, "TenantId", "Status");
    }

    private static TradeLikeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TradeLikeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new TradeLikeDbContext(options);
    }

    private static void SeedCustomers(TradeLikeDbContext context, int tenantId, int count)
    {
        for (var index = 1; index <= count; index++)
        {
            context.Customers.Add(BuildCustomer((tenantId * 1000) + index, tenantId, $"Customer {index:000}", $"customer-{tenantId}-{index}@example.com"));
        }
    }

    private static void SeedCustomer(TradeLikeDbContext context, int tenantId)
    {
        context.Customers.Add(BuildCustomer(tenantId, tenantId, $"Customer {tenantId}", $"customer-{tenantId}@example.com"));
    }

    private static Customer BuildCustomer(int id, int tenantId, string name, string email)
    {
        return new Customer
        {
            Id = id,
            TenantId = tenantId,
            Name = name,
            Email = email,
            Phone = "07123456789",
            Address = "1 Main Street"
        };
    }

    private static Quote BuildQuote(
        string title = "Boiler quote",
        string status = "Draft",
        decimal unitPrice = 100)
    {
        return new Quote
        {
            CustomerId = 1,
            CustomerName = "Customer 1",
            Title = title,
            Status = status,
            DiscountType = "Amount",
            DiscountValue = 0,
            LineItems = new List<QuoteLineItem>
            {
                new()
                {
                    Type = "Labour",
                    Description = "Install boiler",
                    Quantity = 1,
                    UnitPrice = unitPrice,
                    VatRate = 20
                }
            }
        };
    }

    private static void AssertHasIndex<TEntity>(TradeLikeDbContext context, params string[] propertyNames)
    {
        var entityType = context.Model.FindEntityType(typeof(TEntity));

        Assert.NotNull(entityType);
        Assert.Contains(entityType!.GetIndexes(), index =>
            index.Properties.Select(property => property.Name).SequenceEqual(propertyNames));
    }
}
