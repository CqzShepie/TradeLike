using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Customers;
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

    public async Task<Customer> CreateAsync(CreateCustomerRequest request, int tenantId)
    {
        var customer = new Customer
        {
            TenantId = tenantId,
            Name = CleanRequired(request.Name, "Customer name"),
            Phone = CleanRequired(request.Phone, "Phone number"),
            Email = CleanRequired(request.Email, "Email address").ToLowerInvariant(),
            Address = CleanRequired(request.Address, "Address"),
            Notes = CleanOptional(request.Notes)
        };

        await _context.Customers.AddAsync(customer);
        await _context.SaveChangesAsync();

        return customer;
    }

    public async Task<Customer?> UpdateAsync(int id, UpdateCustomerRequest request, int tenantId)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(existingCustomer =>
                existingCustomer.Id == id &&
                existingCustomer.TenantId == tenantId);

        if (customer is null)
        {
            return null;
        }

        if (request.Name is not null)
        {
            customer.Name = CleanRequired(request.Name, "Customer name");
        }

        if (request.Phone is not null)
        {
            customer.Phone = CleanRequired(request.Phone, "Phone number");
        }

        if (request.Email is not null)
        {
            customer.Email = CleanRequired(request.Email, "Email address").ToLowerInvariant();
        }

        if (request.Address is not null)
        {
            customer.Address = CleanRequired(request.Address, "Address");
        }

        customer.Notes = CleanOptional(request.Notes);

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

    private static string CleanRequired(string value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ValidationException($"{label} is required.");
        }

        return value.Trim();
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
