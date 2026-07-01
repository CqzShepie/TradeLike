using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;

namespace TradeLike.Api.Services;

public class CustomerService : ICustomerService
{
    private readonly TradeLikeDbContext _context;

    public CustomerService(TradeLikeDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Customer>> GetAllAsync(int tenantId)
    {
        return await _context.Customers
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<Customer?> GetByIdAsync(int id, int tenantId)
    {
        return await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
    }

    public async Task<Customer> CreateAsync(Customer customer, int tenantId)
    {
        NormaliseCustomer(customer);
        customer.TenantId = tenantId;

        await _context.Customers.AddAsync(customer);
        await _context.SaveChangesAsync();

        return customer;
    }

    public async Task<Customer?> UpdateAsync(int id, Customer updatedCustomer, int tenantId)
    {
        NormaliseCustomer(updatedCustomer);

        var customer = await _context.Customers
            .FirstOrDefaultAsync(existingCustomer =>
                existingCustomer.Id == id &&
                existingCustomer.TenantId == tenantId);

        if (customer is null)
        {
            return null;
        }

        customer.Name = updatedCustomer.Name;
        customer.Phone = updatedCustomer.Phone;
        customer.Email = updatedCustomer.Email;
        customer.Address = updatedCustomer.Address;
        customer.Notes = updatedCustomer.Notes;

        await _context.SaveChangesAsync();

        return customer;
    }

    public async Task<Customer?> DeleteAsync(int id, int tenantId)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(existingCustomer =>
                existingCustomer.Id == id &&
                existingCustomer.TenantId == tenantId);

        if (customer is null)
        {
            return null;
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();

        return customer;
    }

    private static void NormaliseCustomer(Customer customer)
    {
        customer.Name = customer.Name.Trim();
        customer.Phone = customer.Phone.Trim();
        customer.Email = customer.Email.Trim();
        customer.Address = customer.Address.Trim();
        customer.Notes = string.IsNullOrWhiteSpace(customer.Notes)
            ? null
            : customer.Notes.Trim();
    }
}
