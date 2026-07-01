using TradeLike.Api.Contracts.Customers;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface ICustomerService
{
    Task<IReadOnlyList<Customer>> GetAllAsync(int tenantId);

    Task<Customer?> GetByIdAsync(int id, int tenantId);

    Task<Customer> CreateAsync(CreateCustomerRequest request, int tenantId);

    Task<Customer?> UpdateAsync(int id, UpdateCustomerRequest request, int tenantId);

    Task<Customer?> DeleteAsync(int id, int tenantId);
}
