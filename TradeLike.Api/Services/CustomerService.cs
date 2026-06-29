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

    public async Task<IReadOnlyList<Customer>> GetAllAsync()
    {
        return await _context.Customers
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<Customer?> GetByIdAsync(int id)
    {
        return await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Customer> CreateAsync(Customer customer)
    {
        NormaliseCustomer(customer);

        await _context.Customers.AddAsync(customer);
        await _context.SaveChangesAsync();

        return customer;
    }

    public async Task<Customer?> UpdateAsync(int id, Customer updatedCustomer)
    {
        NormaliseCustomer(updatedCustomer);

        var customer = await _context.Customers.FindAsync(id);

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

    public async Task<Customer?> DeleteAsync(int id)
    {
        var customer = await _context.Customers.FindAsync(id);

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