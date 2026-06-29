using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public class QuoteService : IQuoteService
{
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Draft",
        "Sent",
        "Accepted",
        "Rejected"
    };

    private static readonly HashSet<string> AllowedLineTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Labour",
        "Materials",
        "Other"
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
            return null;

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

        quote.LineItems = updatedQuote.LineItems
            .Select(item => new QuoteLineItem
            {
                Type = item.Type,
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                VatRate = item.VatRate,
                LineTotal = item.LineTotal
            })
            .ToList();

        await _context.SaveChangesAsync();

        return quote;
    }

    public async Task<Quote?> DeleteAsync(int id)
    {
        var quote = await _context.Quotes.FindAsync(id);

        if (quote is null)
            return null;

        _context.Quotes.Remove(quote);
        await _context.SaveChangesAsync();

        return quote;
    }

    private static void NormaliseQuote(Quote quote)
    {
        quote.CustomerName = quote.CustomerName.Trim();
        quote.Title = quote.Title.Trim();
        quote.Description = string.IsNullOrWhiteSpace(quote.Description)
            ? null
            : quote.Description.Trim();

        quote.Status = quote.Status.Trim();
        quote.Notes = string.IsNullOrWhiteSpace(quote.Notes)
            ? null
            : quote.Notes.Trim();

        quote.LineItems = quote.LineItems
            .Select(item => new QuoteLineItem
            {
                Type = string.IsNullOrWhiteSpace(item.Type)
                    ? "Other"
                    : item.Type.Trim(),
                Description = item.Description.Trim(),
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
            throw new ValidationException("Customer is required.");

        if (string.IsNullOrWhiteSpace(quote.CustomerName))
            throw new ValidationException("Customer name is required.");

        if (string.IsNullOrWhiteSpace(quote.Title))
            throw new ValidationException("Quote title is required.");

        if (string.IsNullOrWhiteSpace(quote.Status))
            throw new ValidationException("Quote status is required.");

        if (!AllowedStatuses.Contains(quote.Status))
            throw new ValidationException("Quote status is invalid.");

        if (quote.DiscountTotal < 0)
            throw new ValidationException("Discount cannot be negative.");

        if (quote.LineItems.Count == 0)
            throw new ValidationException("At least one quote line item is required.");

        foreach (var item in quote.LineItems)
        {
            if (!AllowedLineTypes.Contains(item.Type))
                throw new ValidationException("Quote line item type is invalid.");

            if (string.IsNullOrWhiteSpace(item.Description))
                throw new ValidationException("Quote line item description is required.");

            if (item.Quantity <= 0)
                throw new ValidationException("Quote line item quantity must be greater than zero.");

            if (item.UnitPrice < 0)
                throw new ValidationException("Quote line item unit price cannot be negative.");

            if (item.VatRate < 0)
                throw new ValidationException("Quote line item VAT rate cannot be negative.");
        }
    }

    private static void CalculateTotals(Quote quote)
    {
        foreach (var item in quote.LineItems)
        {
            var net = item.Quantity * item.UnitPrice;
            var vat = net * (item.VatRate / 100);

            item.LineTotal = decimal.Round(net + vat, 2);
        }

        quote.Subtotal = decimal.Round(
            quote.LineItems.Sum(item => item.Quantity * item.UnitPrice),
            2);

        quote.VatTotal = decimal.Round(
            quote.LineItems.Sum(item => item.Quantity * item.UnitPrice * (item.VatRate / 100)),
            2);

        quote.DiscountTotal = decimal.Round(quote.DiscountTotal, 2);

        quote.Total = decimal.Round(
            Math.Max(0, quote.Subtotal + quote.VatTotal - quote.DiscountTotal),
            2);

        quote.Amount = quote.Total;
    }
}