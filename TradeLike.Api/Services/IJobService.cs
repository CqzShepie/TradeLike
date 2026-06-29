using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface IJobService
{
    Task<IReadOnlyList<Job>> GetAllAsync();

    Task<Job?> GetByIdAsync(int id);

    Task<Job> CreateAsync(Job job);

    Task<Job?> UpdateAsync(int id, Job job);

    Task<Job?> DeleteAsync(int id);

    Task<IReadOnlyList<Job>> GetTodayAsync();

    Task<IReadOnlyList<Job>> GetWeekAsync();
}