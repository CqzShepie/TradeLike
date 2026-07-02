using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Customers;
using TradeLike.Api.Contracts.Pagination;
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

    public async Task<PagedResponse<Customer>> GetPagedAsync(int tenantId, PagedQuery query)
    {
        var page = query.NormalizedPage;
        var pageSize = query.NormalizedPageSize;
        IQueryable<Customer> customers = _context.Customers
            .AsNoTracking()
            .Where(customer => customer.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            customers = customers.Where(customer =>
                customer.Name.Contains(search) ||
                customer.Email.Contains(search) ||
                customer.Phone.Contains(search) ||
                customer.Address.Contains(search));
        }

        customers = (query.SortBy?.Trim().ToLowerInvariant(), query.SortDescending) switch
        {
            ("email", true) => customers.OrderByDescending(customer => customer.Email),
            ("email", false) => customers.OrderBy(customer => customer.Email),
            ("phone", true) => customers.OrderByDescending(customer => customer.Phone),
            ("phone", false) => customers.OrderBy(customer => customer.Phone),
            ("id", true) => customers.OrderByDescending(customer => customer.Id),
            ("id", false) => customers.OrderBy(customer => customer.Id),
            (_, true) => customers.OrderByDescending(customer => customer.Name),
            _ => customers.OrderBy(customer => customer.Name)
        };

        var totalItems = await customers.CountAsync();
        var items = await customers
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return PagedResponse<Customer>.Create(items, page, pageSize, totalItems);
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

        ValidateCustomer(customer);

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
        ValidateCustomer(customer);

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

        // TODO: Move customer removal to soft delete when a retention model is introduced.
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

    private static void ValidateCustomer(Customer customer)
    {
        ValidateMax(customer.Name, 180, "Customer name");
        ValidateMax(customer.Email, 255, "Email address");
        ValidateMax(customer.Phone, 40, "Phone number");
        ValidateMax(customer.Address, 500, "Address");
        ValidateMax(customer.Notes, 4000, "Notes");

        if (!new EmailAddressAttribute().IsValid(customer.Email))
        {
            throw new ValidationException("Enter a valid email address.");
        }
    }

    private static void ValidateMax(string? value, int maxLength, string label)
    {
        if (!string.IsNullOrWhiteSpace(value) && value.Length > maxLength)
        {
            throw new ValidationException($"{label} must be {maxLength} characters or fewer.");
        }
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
