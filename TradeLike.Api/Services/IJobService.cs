using TradeLike.Api.Contracts.Jobs;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface IJobService
{
    Task<IReadOnlyList<Job>> GetAllAsync(int tenantId);

    Task<Job?> GetByIdAsync(int id, int tenantId);

    Task<Job> CreateAsync(CreateJobRequest request, int tenantId);

    Task<Job?> UpdateAsync(int id, UpdateJobRequest request, int tenantId);

    Task<Job?> DeleteAsync(int id, int tenantId);

    Task<IReadOnlyList<Job>> GetTodayAsync(int tenantId);

    Task<IReadOnlyList<Job>> GetWeekAsync(DateTime weekStart, int tenantId);

    Task<Job?> LinkQuoteAsync(int jobId, int quoteId, int tenantId);

    Task<Job?> UnlinkQuoteAsync(int jobId, int tenantId);
}
