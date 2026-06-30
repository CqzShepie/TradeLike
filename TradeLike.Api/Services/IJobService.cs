using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface IJobService
{
    Task<IReadOnlyList<Job>> GetAllAsync();

    Task<Job?> GetByIdAsync(int id);

    Task<Job> CreateAsync(Job job);

    Task<Job?> UpdateAsync(int id, Job updatedJob);

    Task<Job?> DeleteAsync(int id);

    Task<IReadOnlyList<Job>> GetTodayAsync();

    Task<IReadOnlyList<Job>> GetWeekAsync(DateTime weekStart);

    Task<Job?> LinkQuoteAsync(int jobId, int quoteId);

    Task<Job?> UnlinkQuoteAsync(int jobId);
}