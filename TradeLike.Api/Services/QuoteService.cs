using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Pagination;
using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public class QuoteService : IQuoteService
{
    private static readonly string[] AllowedStatuses =
    {
        "Draft",
        "Sent",
        "Accepted",
        "Rejected"
    };

    private static readonly string[] AllowedLineTypes =
    {
        "Labour",
        "Materials",
        "Other"
    };

    private static readonly string[] AllowedDiscountTypes =
    {
        "Amount",
        "Percentage"
    };

    private static readonly string[] AllowedJobPriorities =
    {
        "Low",
        "Normal",
        "High",
        "Urgent"
    };

    private readonly TradeLikeDbContext _context;

    public QuoteService(TradeLikeDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Quote>> GetAllAsync(int tenantId)
    {
        return await _context.Quotes
            .AsNoTracking()
            .Include(q => q.LineItems)
            .Where(q => q.TenantId == tenantId)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
    }

    public async Task<PagedResponse<Quote>> GetPagedAsync(int tenantId, PagedQuery query)
    {
        var page = query.NormalizedPage;
        var pageSize = query.NormalizedPageSize;
        IQueryable<Quote> quotes = _context.Quotes
            .AsNoTracking()
            .Include(quote => quote.LineItems)
            .Where(quote => quote.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            quotes = quotes.Where(quote =>
                quote.CustomerName.Contains(search) ||
                quote.Title.Contains(search) ||
                (quote.Description != null && quote.Description.Contains(search)) ||
                (quote.Notes != null && quote.Notes.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = Canonicalise(query.Status, AllowedStatuses);
            quotes = quotes.Where(quote => quote.Status == status);
        }

        if (query.DateFrom.HasValue)
        {
            var dateFrom = query.DateFrom.Value.Date;
            quotes = quotes.Where(quote => quote.CreatedAt >= dateFrom);
        }

        if (query.DateTo.HasValue)
        {
            var dateTo = query.DateTo.Value.Date.AddDays(1);
            quotes = quotes.Where(quote => quote.CreatedAt < dateTo);
        }

        quotes = (query.SortBy?.Trim().ToLowerInvariant(), query.SortDescending) switch
        {
            ("customer", true) => quotes.OrderByDescending(quote => quote.CustomerName).ThenByDescending(quote => quote.CreatedAt),
            ("customer", false) => quotes.OrderBy(quote => quote.CustomerName).ThenByDescending(quote => quote.CreatedAt),
            ("title", true) => quotes.OrderByDescending(quote => quote.Title).ThenByDescending(quote => quote.CreatedAt),
            ("title", false) => quotes.OrderBy(quote => quote.Title).ThenByDescending(quote => quote.CreatedAt),
            ("status", true) => quotes.OrderByDescending(quote => quote.Status).ThenByDescending(quote => quote.CreatedAt),
            ("status", false) => quotes.OrderBy(quote => quote.Status).ThenByDescending(quote => quote.CreatedAt),
            ("total", true) => quotes.OrderByDescending(quote => quote.Total).ThenByDescending(quote => quote.CreatedAt),
            ("total", false) => quotes.OrderBy(quote => quote.Total).ThenByDescending(quote => quote.CreatedAt),
            ("id", true) => quotes.OrderByDescending(quote => quote.Id),
            ("id", false) => quotes.OrderBy(quote => quote.Id),
            (_, false) => quotes.OrderBy(quote => quote.CreatedAt),
            _ => quotes.OrderByDescending(quote => quote.CreatedAt)
        };

        var totalItems = await quotes.CountAsync();
        var items = await quotes
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return PagedResponse<Quote>.Create(items, page, pageSize, totalItems);
    }

    public async Task<Quote?> GetByIdAsync(int id, int tenantId)
    {
        return await _context.Quotes
            .AsNoTracking()
            .Include(q => q.LineItems)
            .FirstOrDefaultAsync(q => q.Id == id && q.TenantId == tenantId);
    }

    public async Task<Quote> CreateAsync(Quote quote, int tenantId)
    {
        NormaliseQuote(quote);
        ValidateQuote(quote);
        await EnsureCustomerBelongsToTenantAsync(quote.CustomerId, tenantId);
        CalculateTotals(quote);
        AssignTenant(quote, tenantId);

        quote.CreatedAt = DateTime.UtcNow;

        await _context.Quotes.AddAsync(quote);
        await _context.SaveChangesAsync();

        return quote;
    }

    public async Task<Quote?> UpdateAsync(int id, Quote updatedQuote, int tenantId)
    {
        NormaliseQuote(updatedQuote);
        ValidateQuote(updatedQuote);
        await EnsureCustomerBelongsToTenantAsync(updatedQuote.CustomerId, tenantId);
        CalculateTotals(updatedQuote);
        AssignTenant(updatedQuote, tenantId);

        var quote = await _context.Quotes
            .Include(q => q.LineItems)
            .FirstOrDefaultAsync(q => q.Id == id && q.TenantId == tenantId);

        if (quote is null)
        {
            return null;
        }

        if (IsFinanciallyLocked(quote, tenantId))
        {
            throw new ValidationException("Accepted or converted quotes cannot be edited. Reopen the quote before changing totals or line items.");
        }

        quote.CustomerId = updatedQuote.CustomerId;
        quote.CustomerName = updatedQuote.CustomerName;
        quote.Title = updatedQuote.Title;
        quote.Description = updatedQuote.Description;
        quote.Amount = updatedQuote.Amount;
        quote.Subtotal = updatedQuote.Subtotal;
        quote.VatTotal = updatedQuote.VatTotal;
        quote.DiscountType = updatedQuote.DiscountType;
        quote.DiscountValue = updatedQuote.DiscountValue;
        quote.DiscountTotal = updatedQuote.DiscountTotal;
        quote.Total = updatedQuote.Total;
        quote.Status = updatedQuote.Status;
        quote.Notes = updatedQuote.Notes;

        _context.QuoteLineItems.RemoveRange(quote.LineItems);
        quote.LineItems.Clear();

        foreach (var item in updatedQuote.LineItems)
        {
            quote.LineItems.Add(new QuoteLineItem
            {
                TenantId = tenantId,
                Type = item.Type,
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                VatRate = item.VatRate,
                LineTotal = item.LineTotal
            });
        }

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id, tenantId);
    }

    public async Task<Quote?> DeleteAsync(int id, int tenantId)
    {
        var quote = await _context.Quotes
            .Include(existingQuote => existingQuote.LineItems)
            .FirstOrDefaultAsync(existingQuote =>
                existingQuote.Id == id &&
                existingQuote.TenantId == tenantId);

        if (quote is null)
        {
            return null;
        }

        // TODO: Move quote removal to soft delete when a retention model is introduced.
        _context.Quotes.Remove(quote);
        await _context.SaveChangesAsync();

        return quote;
    }

    public async Task<Job?> ConvertAcceptedQuoteToJobAsync(
        int quoteId,
        ConvertQuoteToJobRequest request,
        int tenantId)
    {
        var quote = await _context.Quotes
            .AsNoTracking()
            .Include(q => q.LineItems)
            .FirstOrDefaultAsync(q => q.Id == quoteId && q.TenantId == tenantId);

        if (quote is null)
        {
            return null;
        }

        if (!string.Equals(quote.Status, "Accepted", StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Only accepted quotes can be converted to jobs. Mark the quote as Accepted first.");
        }

        var alreadyConverted = await _context.Jobs
            .AsNoTracking()
            .AnyAsync(job =>
                job.TenantId == tenantId &&
                job.QuoteId == quoteId);

        if (alreadyConverted)
        {
            throw new ValidationException(
                "This quote has already been converted to a job.");
        }

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer =>
                customer.Id == quote.CustomerId &&
                customer.TenantId == tenantId);

        if (customer is null)
        {
            throw new ValidationException("Customer was not found.");
        }

        await EnsureEngineerBelongsToTenantAsync(request.EngineerId, tenantId);

        var priority = Canonicalise(
            string.IsNullOrWhiteSpace(request.Priority)
                ? "Normal"
                : request.Priority,
            AllowedJobPriorities);

        var job = new Job
        {
            TenantId = tenantId,
            Customer = quote.CustomerName.Trim(),
            Phone = FirstNonBlank(request.Phone, customer?.Phone),
            JobTitle = FirstNonBlank(request.JobTitle, quote.Title),
            Address = FirstNonBlank(request.Address, customer?.Address),
            ScheduledDate = request.ScheduledDate,
            Status = "Scheduled",
            Priority = priority,
            Notes = BuildJobNotes(quote, request.Notes),
            QuoteId = quote.Id,
            EngineerId = request.EngineerId
        };

        ValidateConvertedJob(job);

        await _context.Jobs.AddAsync(job);
        await _context.SaveChangesAsync();

        return job;
    }

    private async Task EnsureCustomerBelongsToTenantAsync(int customerId, int tenantId)
    {
        var customerExists = await _context.Customers
            .AsNoTracking()
            .AnyAsync(customer =>
                customer.Id == customerId &&
                customer.TenantId == tenantId);

        if (!customerExists)
        {
            throw new ValidationException("Customer was not found.");
        }
    }

    private async Task EnsureEngineerBelongsToTenantAsync(int? engineerId, int tenantId)
    {
        if (engineerId is null)
        {
            return;
        }

        var engineerExists = await _context.Engineers
            .AsNoTracking()
            .AnyAsync(engineer =>
                engineer.Id == engineerId &&
                engineer.TenantId == tenantId);

        if (!engineerExists)
        {
            throw new ValidationException("Engineer was not found.");
        }
    }

    private static void AssignTenant(Quote quote, int tenantId)
    {
        quote.TenantId = tenantId;

        foreach (var item in quote.LineItems)
        {
            item.TenantId = tenantId;
        }
    }

    private static void NormaliseQuote(Quote quote)
    {
        quote.CustomerName = quote.CustomerName.Trim();
        quote.Title = quote.Title.Trim();

        quote.Description = string.IsNullOrWhiteSpace(quote.Description)
            ? null
            : quote.Description.Trim();

        quote.Status = Canonicalise(quote.Status, AllowedStatuses);

        quote.DiscountType = Canonicalise(
            string.IsNullOrWhiteSpace(quote.DiscountType)
                ? "Amount"
                : quote.DiscountType,
            AllowedDiscountTypes);

        quote.DiscountValue = RoundMoney(quote.DiscountValue);
        quote.DiscountTotal = RoundMoney(quote.DiscountTotal);

        if (quote.DiscountType == "Amount" &&
            quote.DiscountValue == 0 &&
            quote.DiscountTotal > 0)
        {
            quote.DiscountValue = quote.DiscountTotal;
        }

        quote.Notes = string.IsNullOrWhiteSpace(quote.Notes)
            ? null
            : quote.Notes.Trim();

        quote.LineItems ??= new List<QuoteLineItem>();

        quote.LineItems = quote.LineItems
            .Select(item => new QuoteLineItem
            {
                Type = Canonicalise(
                    string.IsNullOrWhiteSpace(item.Type)
                        ? "Other"
                        : item.Type,
                    AllowedLineTypes),
                Description = item.Description?.Trim() ?? string.Empty,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                VatRate = item.VatRate,
                LineTotal = item.LineTotal
            })
            .ToList();
    }

    private static void ValidateQuote(Quote quote)
    {
        if (quote.CustomerId <= 0)
        {
            throw new ValidationException("Customer is required.");
        }

        if (string.IsNullOrWhiteSpace(quote.CustomerName))
        {
            throw new ValidationException("Customer name is required.");
        }

        if (quote.CustomerName.Length > 150)
        {
            throw new ValidationException("Customer name must be 150 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(quote.Title))
        {
            throw new ValidationException("Quote title is required.");
        }

        if (quote.Title.Length > 200)
        {
            throw new ValidationException("Quote title must be 200 characters or fewer.");
        }

        if (!string.IsNullOrWhiteSpace(quote.Description) &&
            quote.Description.Length > 4000)
        {
            throw new ValidationException("Quote description must be 4000 characters or fewer.");
        }

        if (!AllowedStatuses.Contains(quote.Status, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Quote status is invalid. Use Draft, Sent, Accepted, or Rejected.");
        }

        if (!AllowedDiscountTypes.Contains(quote.DiscountType, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Discount type is invalid. Use Amount or Percentage.");
        }

        if (quote.DiscountValue < 0)
        {
            throw new ValidationException("Discount value cannot be negative.");
        }

        if (quote.DiscountTotal < 0)
        {
            throw new ValidationException("Discount total cannot be negative.");
        }

        if (quote.DiscountType == "Percentage" && quote.DiscountValue > 100)
        {
            throw new ValidationException("Percentage discount cannot be more than 100%.");
        }

        if (!string.IsNullOrWhiteSpace(quote.Notes) && quote.Notes.Length > 4000)
        {
            throw new ValidationException("Quote notes must be 4000 characters or fewer.");
        }

        if (quote.LineItems.Count == 0)
        {
            throw new ValidationException("At least one priced quote line item is required.");
        }

        for (var index = 0; index < quote.LineItems.Count; index++)
        {
            var lineNumber = index + 1;
            var item = quote.LineItems[index];

            if (!AllowedLineTypes.Contains(item.Type, StringComparer.OrdinalIgnoreCase))
            {
                throw new ValidationException(
                    $"Line {lineNumber} has an invalid type. Use Labour, Materials, or Other.");
            }

            if (string.IsNullOrWhiteSpace(item.Description))
            {
                throw new ValidationException(
                    $"Line {lineNumber} needs a line item description.");
            }

            if (item.Description.Length > 250)
            {
                throw new ValidationException(
                    $"Line {lineNumber} description must be 250 characters or fewer.");
            }

            if (item.Quantity <= 0)
            {
                throw new ValidationException(
                    $"Line {lineNumber} quantity must be greater than zero.");
            }

            if (item.UnitPrice < 0)
            {
                throw new ValidationException(
                    $"Line {lineNumber} unit price cannot be negative.");
            }

            if (item.LineTotal < 0)
            {
                throw new ValidationException(
                    $"Line {lineNumber} total cannot be negative.");
            }

            if (item.VatRate < 0 || item.VatRate > 100)
            {
                throw new ValidationException(
                    $"Line {lineNumber} VAT rate must be between 0 and 100.");
            }
        }
    }

    private static void CalculateTotals(Quote quote)
    {
        foreach (var item in quote.LineItems)
        {
            var net = item.Quantity * item.UnitPrice;
            var vat = net * (item.VatRate / 100);

            item.LineTotal = RoundMoney(net + vat);
        }

        quote.Subtotal = RoundMoney(
            quote.LineItems.Sum(item => item.Quantity * item.UnitPrice));

        quote.VatTotal = RoundMoney(
            quote.LineItems.Sum(item =>
                item.Quantity * item.UnitPrice * (item.VatRate / 100)));

        var preDiscountTotal = RoundMoney(quote.Subtotal + quote.VatTotal);

        quote.DiscountTotal = quote.DiscountType == "Percentage"
            ? RoundMoney(preDiscountTotal * (quote.DiscountValue / 100))
            : RoundMoney(quote.DiscountValue);

        if (quote.DiscountTotal > preDiscountTotal)
        {
            quote.DiscountTotal = preDiscountTotal;
        }

        quote.Total = RoundMoney(preDiscountTotal - quote.DiscountTotal);
        quote.Amount = quote.Total;
    }

    private bool IsFinanciallyLocked(Quote quote, int tenantId)
    {
        if (string.Equals(quote.Status, "Accepted", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return _context.Jobs
            .AsNoTracking()
            .Any(job => job.TenantId == tenantId && job.QuoteId == quote.Id);
    }

    private static void ValidateConvertedJob(Job job)
    {
        if (job.ScheduledDate.Year < 2024 || job.ScheduledDate.Year > 2099)
        {
            throw new ValidationException("Scheduled date must be between 2024 and 2099.");
        }

        if (string.IsNullOrWhiteSpace(job.Customer))
        {
            throw new ValidationException("Customer is required.");
        }

        if (job.Customer.Length > 180)
        {
            throw new ValidationException("Customer must be 180 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(job.Phone))
        {
            throw new ValidationException(
                "Phone number is required. Add it to the conversion form or the customer record.");
        }

        if (job.Phone.Length > 40)
        {
            throw new ValidationException("Phone number must be 40 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(job.JobTitle))
        {
            throw new ValidationException("Job title is required.");
        }

        if (job.JobTitle.Length > 220)
        {
            throw new ValidationException("Job title must be 220 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(job.Address))
        {
            throw new ValidationException(
                "Address is required. Add it to the conversion form or the customer record.");
        }

        if (job.Address.Length > 500)
        {
            throw new ValidationException("Address must be 500 characters or fewer.");
        }

        if (!AllowedJobPriorities.Contains(job.Priority, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Job priority is invalid. Use Low, Normal, High, or Urgent.");
        }

        if (!string.IsNullOrWhiteSpace(job.Notes) && job.Notes.Length > 4000)
        {
            throw new ValidationException("Job notes must be 4000 characters or fewer.");
        }
    }

    private static string BuildJobNotes(Quote quote, string? conversionNotes)
    {
        var parts = new List<string>
        {
            $"Created from Quote #{quote.Id}: {quote.Title}",
            $"Quote subtotal: {quote.Subtotal:0.00}",
            $"Quote VAT: {quote.VatTotal:0.00}",
            $"Quote discount: {quote.DiscountTotal:0.00}",
            $"Quote total: {quote.Total:0.00}"
        };

        if (!string.IsNullOrWhiteSpace(quote.Description))
        {
            parts.Add("");
            parts.Add("Quote overview:");
            parts.Add(quote.Description.Trim());
        }

        if (quote.LineItems.Count > 0)
        {
            parts.Add("");
            parts.Add("Quoted line items:");

            foreach (var item in quote.LineItems.OrderBy(item => item.Id))
            {
                parts.Add(
                    $"- [{item.Type}] {item.Description} | Qty: {item.Quantity:0.##} | Unit: {item.UnitPrice:0.00} | VAT: {item.VatRate:0.##}% | Line total: {item.LineTotal:0.00}");
            }
        }

        if (!string.IsNullOrWhiteSpace(quote.Notes))
        {
            parts.Add("");
            parts.Add("Quote notes:");
            parts.Add(quote.Notes.Trim());
        }

        if (!string.IsNullOrWhiteSpace(conversionNotes))
        {
            parts.Add("");
            parts.Add("Conversion notes:");
            parts.Add(conversionNotes.Trim());
        }

        var notes = string.Join(Environment.NewLine, parts);

        return notes.Length <= 4000 ? notes : notes[..4000];
    }

    private static string FirstNonBlank(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return string.Empty;
    }

    private static string Canonicalise(string value, IReadOnlyCollection<string> allowedValues)
    {
        var trimmed = value.Trim();

        return allowedValues.FirstOrDefault(
            allowed => string.Equals(allowed, trimmed, StringComparison.OrdinalIgnoreCase))
            ?? trimmed;
    }

    private static decimal RoundMoney(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}
