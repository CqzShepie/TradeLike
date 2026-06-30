using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
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

    public async Task<IReadOnlyList<Quote>> GetAllAsync()
    {
        return await _context.Quotes
            .AsNoTracking()
            .Include(q => q.LineItems)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
    }

    public async Task<Quote?> GetByIdAsync(int id)
    {
        return await _context.Quotes
            .AsNoTracking()
            .Include(q => q.LineItems)
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    public async Task<Quote> CreateAsync(Quote quote)
    {
        NormaliseQuote(quote);
        ValidateQuote(quote);
        CalculateTotals(quote);

        quote.CreatedAt = DateTime.UtcNow;

        await _context.Quotes.AddAsync(quote);
        await _context.SaveChangesAsync();

        return quote;
    }

    public async Task<Quote?> UpdateAsync(int id, Quote updatedQuote)
    {
        NormaliseQuote(updatedQuote);
        ValidateQuote(updatedQuote);
        CalculateTotals(updatedQuote);

        var quote = await _context.Quotes
            .Include(q => q.LineItems)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (quote is null)
        {
            return null;
        }

        quote.CustomerId = updatedQuote.CustomerId;
        quote.CustomerName = updatedQuote.CustomerName;
        quote.Title = updatedQuote.Title;
        quote.Description = updatedQuote.Description;
        quote.Amount = updatedQuote.Amount;
        quote.Subtotal = updatedQuote.Subtotal;
        quote.VatTotal = updatedQuote.VatTotal;
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
                Type = item.Type,
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                VatRate = item.VatRate,
                LineTotal = item.LineTotal
            });
        }

        await _context.SaveChangesAsync();

        return quote;
    }

    public async Task<Quote?> DeleteAsync(int id)
    {
        var quote = await _context.Quotes.FindAsync(id);

        if (quote is null)
        {
            return null;
        }

        _context.Quotes.Remove(quote);
        await _context.SaveChangesAsync();

        return quote;
    }

    public async Task<Job?> ConvertAcceptedQuoteToJobAsync(
        int quoteId,
        ConvertQuoteToJobRequest request)
    {
        var quote = await _context.Quotes
            .AsNoTracking()
            .Include(q => q.LineItems)
            .FirstOrDefaultAsync(q => q.Id == quoteId);

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
            .AnyAsync(job => job.QuoteId == quoteId);

        if (alreadyConverted)
        {
            throw new ValidationException(
                "This quote has already been converted to a job.");
        }

        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(customer => customer.Id == quote.CustomerId);

        var priority = Canonicalise(
            string.IsNullOrWhiteSpace(request.Priority) ? "Normal" : request.Priority,
            AllowedJobPriorities);

        var job = new Job
        {
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

    private static void NormaliseQuote(Quote quote)
    {
        quote.CustomerName = quote.CustomerName.Trim();
        quote.Title = quote.Title.Trim();
        quote.Description = string.IsNullOrWhiteSpace(quote.Description)
            ? null
            : quote.Description.Trim();
        quote.Status = Canonicalise(quote.Status, AllowedStatuses);
        quote.Notes = string.IsNullOrWhiteSpace(quote.Notes)
            ? null
            : quote.Notes.Trim();

        quote.LineItems = quote.LineItems
            .Select(item => new QuoteLineItem
            {
                Type = Canonicalise(
                    string.IsNullOrWhiteSpace(item.Type) ? "Other" : item.Type,
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

        if (string.IsNullOrWhiteSpace(quote.Status))
        {
            throw new ValidationException("Quote status is required.");
        }

        if (!AllowedStatuses.Contains(quote.Status, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException(
                "Quote status is invalid. Use Draft, Sent, Accepted, or Rejected.");
        }

        if (!string.IsNullOrWhiteSpace(quote.Notes) &&
            quote.Notes.Length > 4000)
        {
            throw new ValidationException("Quote notes must be 4000 characters or fewer.");
        }

        if (quote.DiscountTotal < 0)
        {
            throw new ValidationException("Discount cannot be negative.");
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

        quote.DiscountTotal = RoundMoney(quote.DiscountTotal);

        quote.Total = RoundMoney(
            Math.Max(0, quote.Subtotal + quote.VatTotal - quote.DiscountTotal));

        quote.Amount = quote.Total;
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

        if (string.IsNullOrWhiteSpace(job.Phone))
        {
            throw new ValidationException(
                "Phone number is required. Add it to the conversion form or the customer record.");
        }

        if (string.IsNullOrWhiteSpace(job.JobTitle))
        {
            throw new ValidationException("Job title is required.");
        }

        if (string.IsNullOrWhiteSpace(job.Address))
        {
            throw new ValidationException(
                "Address is required. Add it to the conversion form or the customer record.");
        }

        if (!AllowedJobPriorities.Contains(job.Priority, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("Job priority is invalid. Use Low, Normal, High, or Urgent.");
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

        return notes.Length <= 4000
            ? notes
            : notes[..4000];
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