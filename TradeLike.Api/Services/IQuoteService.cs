using TradeLike.Api.Contracts.Pagination;
using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface IQuoteService
{
    Task<IReadOnlyList<Quote>> GetAllAsync(int tenantId);

    Task<PagedResponse<Quote>> GetPagedAsync(int tenantId, PagedQuery query);

    Task<Quote?> GetByIdAsync(int id, int tenantId);

    Task<Quote> CreateAsync(Quote quote, int tenantId);

    Task<Quote?> UpdateAsync(int id, Quote quote, int tenantId);

    Task<Quote?> DeleteAsync(int id, int tenantId);

    Task<Job?> ConvertAcceptedQuoteToJobAsync(
        int quoteId,
        ConvertQuoteToJobRequest request,
        int tenantId);
}
