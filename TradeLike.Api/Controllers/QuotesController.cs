using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Models;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuotesController : ControllerBase
{
    private readonly IQuoteService _quoteService;

    public QuotesController(IQuoteService quoteService)
    {
        _quoteService = quoteService;
    }

    [HttpGet]
    public async Task<IActionResult> GetQuotes()
    {
        var quotes = await _quoteService.GetAllAsync();
        return Ok(quotes);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetQuote(int id)
    {
        var quote = await _quoteService.GetByIdAsync(id);

        if (quote is null)
            return NotFound();

        return Ok(quote);
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuote([FromBody] CreateQuoteRequest request)
    {
        try
        {
            var quote = new Quote
            {
                CustomerId = request.CustomerId,
                CustomerName = request.CustomerName,
                Title = request.Title,
                Description = request.Description,
                Amount = request.Amount,
                Status = request.Status
            };

            var created = await _quoteService.CreateAsync(quote);

            return CreatedAtAction(
                nameof(GetQuote),
                new { id = created.Id },
                created);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new
            {
                error = ex.Message
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateQuote(
        int id,
        [FromBody] UpdateQuoteRequest request)
    {
        try
        {
            var quote = new Quote
            {
                CustomerId = request.CustomerId,
                CustomerName = request.CustomerName,
                Title = request.Title,
                Description = request.Description,
                Amount = request.Amount,
                Status = request.Status
            };

            var updated = await _quoteService.UpdateAsync(id, quote);

            if (updated is null)
                return NotFound();

            return Ok(updated);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new
            {
                error = ex.Message
            });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteQuote(int id)
    {
        var deleted = await _quoteService.DeleteAsync(id);

        if (deleted is null)
            return NotFound();

        return Ok(deleted);
    }
}