using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Models;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuoteController : ControllerBase
{
    private readonly IQuoteService _quoteService;

    public QuoteController(IQuoteService quoteService)
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
    public async Task<IActionResult> CreateQuote([FromBody] Quote quote)
    {
        var created = await _quoteService.CreateAsync(quote);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateQuote(int id, [FromBody] Quote quote)
    {
        var updated = await _quoteService.UpdateAsync(id, quote);

        if (updated is null)
            return NotFound();

        return Ok(updated);
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