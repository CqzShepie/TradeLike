using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface ICustomerService
{
    Task<IReadOnlyList<Customer>> GetAllAsync(int tenantId);

    Task<Customer?> GetByIdAsync(int id, int tenantId);

    Task<Customer> CreateAsync(Customer customer, int tenantId);

    Task<Customer?> UpdateAsync(int id, Customer customer, int tenantId);

    Task<Customer?> DeleteAsync(int id, int tenantId);
}
