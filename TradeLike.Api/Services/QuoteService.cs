using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public class QuoteService : IQuoteService
{
    private readonly TradeLikeDbContext _context;

    public QuoteService(TradeLikeDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Quote>> GetAllAsync()
    {
        return await _context.Quotes
            .AsNoTracking()
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
    }

    public async Task<Quote?> GetByIdAsync(int id)
    {
        return await _context.Quotes
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    public async Task<Quote> CreateAsync(Quote quote)
    {
        ValidateQuote(quote);

        quote.CreatedAt = DateTime.UtcNow;

        await _context.Quotes.AddAsync(quote);
        await _context.SaveChangesAsync();

        return quote;
    }

    public async Task<Quote?> UpdateAsync(int id, Quote updatedQuote)
    {
        ValidateQuote(updatedQuote);

        var quote = await _context.Quotes.FindAsync(id);

        if (quote is null)
            return null;

        quote.CustomerId = updatedQuote.CustomerId;
        quote.CustomerName = updatedQuote.CustomerName;
        quote.Title = updatedQuote.Title;
        quote.Description = updatedQuote.Description;
        quote.Amount = updatedQuote.Amount;
        quote.Status = updatedQuote.Status;

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

    private static void ValidateQuote(Quote quote)
    {
        if (quote.CustomerId <= 0)
            throw new ValidationException("Customer is required.");

        if (string.IsNullOrWhiteSpace(quote.CustomerName))
            throw new ValidationException("Customer name is required.");

        if (string.IsNullOrWhiteSpace(quote.Title))
            throw new ValidationException("Quote title is required.");

        if (quote.Amount <= 0)
            throw new ValidationException("Quote amount must be greater than zero.");

        if (string.IsNullOrWhiteSpace(quote.Status))
            throw new ValidationException("Quote status is required.");
    }
}