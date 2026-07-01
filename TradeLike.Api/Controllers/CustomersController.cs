using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;
using TradeLike.Api.Security;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireCustomerRole")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers()
    {
        var customers = await _customerService.GetAllAsync(TenantHelpers.GetTenantId(HttpContext));

        return Ok(customers);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCustomer(int id)
    {
        var customer = await _customerService.GetByIdAsync(id, TenantHelpers.GetTenantId(HttpContext));

        if (customer is null)
        {
            return NotFound();
        }

        return Ok(customer);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] Customer customer)
    {
        var createdCustomer = await _customerService.CreateAsync(customer, TenantHelpers.GetTenantId(HttpContext));

        return CreatedAtAction(
            nameof(GetCustomer),
            new { id = createdCustomer.Id },
            createdCustomer);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] Customer customer)
    {
        var updatedCustomer = await _customerService.UpdateAsync(id, customer, TenantHelpers.GetTenantId(HttpContext));

        if (updatedCustomer is null)
        {
            return NotFound();
        }

        return Ok(updatedCustomer);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var deletedCustomer = await _customerService.DeleteAsync(id, TenantHelpers.GetTenantId(HttpContext));

        if (deletedCustomer is null)
        {
            return NotFound();
        }

        return Ok(deletedCustomer);
    }
}
