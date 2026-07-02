using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Contracts.Customers;
using TradeLike.Api.Contracts.Pagination;
using TradeLike.Api.Security;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireEmployeeRole")]
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

    [HttpGet("paged")]
    public async Task<IActionResult> GetCustomersPaged([FromQuery] PagedQuery query)
    {
        var customers = await _customerService.GetPagedAsync(TenantHelpers.GetTenantId(HttpContext), query);

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
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        try
        {
            var createdCustomer = await _customerService.CreateAsync(request, TenantHelpers.GetTenantId(HttpContext));

            return CreatedAtAction(
                nameof(GetCustomer),
                new { id = createdCustomer.Id },
                createdCustomer);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] UpdateCustomerRequest request)
    {
        try
        {
            var updatedCustomer = await _customerService.UpdateAsync(id, request, TenantHelpers.GetTenantId(HttpContext));

            if (updatedCustomer is null)
            {
                return NotFound();
            }

            return Ok(updatedCustomer);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
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
