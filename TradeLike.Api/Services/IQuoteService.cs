using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface IQuoteService
{
    Task<IReadOnlyList<Quote>> GetAllAsync();

    Task<Quote?> GetByIdAsync(int id);

    Task<Quote> CreateAsync(Quote quote);

    Task<Quote?> UpdateAsync(int id, Quote quote);

    Task<Quote?> DeleteAsync(int id);

    Task<Job?> ConvertAcceptedQuoteToJobAsync(
        int quoteId,
        ConvertQuoteToJobRequest request);
}