using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    // GET
    [HttpGet]
    public async Task<IActionResult> GetCustomers()
    {
        var customers = await _customerService.GetAllAsync();

        return Ok(customers);
    }

    // POST
    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] Customer customer)
    {
        var createdCustomer = await _customerService.CreateAsync(customer);

        return Ok(createdCustomer);
    }

    // PUT
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] Customer customer)
    {
        var updatedCustomer = await _customerService.UpdateAsync(id, customer);

        if (updatedCustomer is null)
        {
            return NotFound();
        }

        return Ok(updatedCustomer);
    }

    // DELETE
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var deletedCustomer = await _customerService.DeleteAsync(id);

        if (deletedCustomer is null)
        {
            return NotFound();
        }

        return Ok(deletedCustomer);
    }
}