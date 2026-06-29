using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public interface ICustomerService
{
    Task<IReadOnlyList<Customer>> GetAllAsync();

    Task<Customer?> GetByIdAsync(int id);

    Task<Customer> CreateAsync(Customer customer);

    Task<Customer?> UpdateAsync(int id, Customer customer);

    Task<Customer?> DeleteAsync(int id);
}