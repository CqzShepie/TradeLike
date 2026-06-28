using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuotesController : ControllerBase
{
    private static List<Quote> Quotes = new()
    {
        new Quote
        {
            Id = 1,
            CustomerId = 1,
            CustomerName = "John Williams",
            Title = "Boiler Installation",
            Description = "Supply and fit new combi boiler.",
            Amount = 2450,
            Status = "Draft"
        },
        new Quote
        {
            Id = 2,
            CustomerId = 2,
            CustomerName = "Sarah Smith",
            Title = "Bathroom Renovation",
            Description = "Complete bathroom refurbishment.",
            Amount = 4800,
            Status = "Sent"
        }
    };

    // GET
    [HttpGet]
    public IActionResult GetQuotes()
    {
        return Ok(Quotes);
    }

    // POST
    [HttpPost]
    public IActionResult CreateQuote([FromBody] Quote quote)
    {
        quote.Id = Quotes.Count + 1;
        quote.CreatedAt = DateTime.UtcNow;

        Quotes.Add(quote);

        return Ok(quote);
    }

    // DELETE
    [HttpDelete("{id}")]
    public IActionResult DeleteQuote(int id)
    {
        var quote = Quotes.FirstOrDefault(x => x.Id == id);

        if (quote == null)
            return NotFound();

        Quotes.Remove(quote);

        return Ok(quote);
    }

    // PUT
    [HttpPut("{id}")]
    public IActionResult UpdateQuote(int id, [FromBody] Quote updatedQuote)
    {
        var quote = Quotes.FirstOrDefault(x => x.Id == id);

        if (quote == null)
            return NotFound();

        quote.CustomerId = updatedQuote.CustomerId;
        quote.CustomerName = updatedQuote.CustomerName;
        quote.Title = updatedQuote.Title;
        quote.Description = updatedQuote.Description;
        quote.Amount = updatedQuote.Amount;
        quote.Status = updatedQuote.Status;

        return Ok(quote);
    }
}