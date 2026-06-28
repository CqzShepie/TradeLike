using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private static List<Customer> Customers = new()
    {
        new Customer
        {
            Id = 1,
            Name = "John Williams",
            Phone = "07700111222",
            Email = "john@example.com",
            Address = "London"
        },
        new Customer
        {
            Id = 2,
            Name = "Sarah Smith",
            Phone = "07700333444",
            Email = "sarah@example.com",
            Address = "Manchester"
        }
    };

    // GET
    [HttpGet]
    public IActionResult GetCustomers()
    {
        return Ok(Customers);
    }

    // POST
    [HttpPost]
    public IActionResult CreateCustomer([FromBody] Customer customer)
    {
        customer.Id = Customers.Count + 1;
        Customers.Add(customer);

        return Ok(customer);
    }

    // DELETE
    [HttpDelete("{id}")]
    public IActionResult DeleteCustomer(int id)
    {
        var customer = Customers.FirstOrDefault(x => x.Id == id);

        if (customer == null)
            return NotFound();

        Customers.Remove(customer);

        return Ok(customer);
    }

    // PUT
    [HttpPut("{id}")]
    public IActionResult UpdateCustomer(int id, [FromBody] Customer updatedCustomer)
    {
        var customer = Customers.FirstOrDefault(x => x.Id == id);

        if (customer == null)
            return NotFound();

        customer.Name = updatedCustomer.Name;
        customer.Phone = updatedCustomer.Phone;
        customer.Email = updatedCustomer.Email;
        customer.Address = updatedCustomer.Address;

        return Ok(customer);
    }
}