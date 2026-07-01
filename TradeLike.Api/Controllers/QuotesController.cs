using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Contracts.Quotes;
using TradeLike.Api.Models;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireCustomerRole")]
public class QuotesController : ControllerBase
{
    private readonly IQuoteService _quoteService;

    public QuotesController(IQuoteService quoteService)
    {
        _quoteService = quoteService;
    }

    [HttpGet]
    public async Task<ActionResult<List<QuoteResponse>>> GetQuotes()
    {
        var quotes = await _quoteService.GetAllAsync();

        return Ok(quotes.Select(ToResponse).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<QuoteResponse>> GetQuote(int id)
    {
        var quote = await _quoteService.GetByIdAsync(id);

        if (quote is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(quote));
    }

    [HttpPost]
    public async Task<ActionResult<QuoteResponse>> CreateQuote(
        [FromBody] CreateQuoteRequest request)
    {
        try
        {
            var quote = ToQuote(request);
            var created = await _quoteService.CreateAsync(quote);
            var response = ToResponse(created);

            return CreatedAtAction(
                nameof(GetQuote),
                new { id = response.Id },
                response);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<QuoteResponse>> UpdateQuote(
        int id,
        [FromBody] UpdateQuoteRequest request)
    {
        try
        {
            var quote = ToQuote(request);
            var updated = await _quoteService.UpdateAsync(id, quote);

            if (updated is null)
            {
                return NotFound();
            }

            return Ok(ToResponse(updated));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/convert-to-job")]
    public async Task<ActionResult<object>> ConvertQuoteToJob(
        int id,
        [FromBody] ConvertQuoteToJobRequest request)
    {
        try
        {
            var job = await _quoteService.ConvertAcceptedQuoteToJobAsync(id, request);

            if (job is null)
            {
                return NotFound();
            }

            var response = ToJobCreatedResponse(job);

            return CreatedAtAction(
                "GetJob",
                "Jobs",
                new { id = job.Id },
                response);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<QuoteResponse>> DeleteQuote(int id)
    {
        var deleted = await _quoteService.DeleteAsync(id);

        if (deleted is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(deleted));
    }

    private static Quote ToQuote(CreateQuoteRequest request)
    {
        return new Quote
        {
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            Title = request.Title,
            Description = request.Description,
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            DiscountTotal = request.DiscountTotal,
            Status = request.Status,
            Notes = request.Notes,
            LineItems = request.LineItems
                .Select(ToLineItem)
                .ToList()
        };
    }

    private static Quote ToQuote(UpdateQuoteRequest request)
    {
        return new Quote
        {
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            Title = request.Title,
            Description = request.Description,
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            DiscountTotal = request.DiscountTotal,
            Status = request.Status,
            Notes = request.Notes,
            LineItems = request.LineItems
                .Select(ToLineItem)
                .ToList()
        };
    }

    private static QuoteLineItem ToLineItem(QuoteLineItemRequest request)
    {
        return new QuoteLineItem
        {
            Type = request.Type,
            Description = request.Description,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            VatRate = request.VatRate
        };
    }

    private static QuoteResponse ToResponse(Quote quote)
    {
        return new QuoteResponse
        {
            Id = quote.Id,
            CustomerId = quote.CustomerId,
            CustomerName = quote.CustomerName,
            Title = quote.Title,
            Description = quote.Description,
            Amount = quote.Amount,
            Subtotal = quote.Subtotal,
            VatTotal = quote.VatTotal,
            DiscountType = quote.DiscountType,
            DiscountValue = quote.DiscountValue,
            DiscountTotal = quote.DiscountTotal,
            Total = quote.Total,
            Status = quote.Status,
            Notes = quote.Notes,
            CreatedAt = quote.CreatedAt,
            LineItems = quote.LineItems
                .OrderBy(item => item.Id)
                .Select(ToResponse)
                .ToList()
        };
    }

    private static QuoteLineItemResponse ToResponse(QuoteLineItem item)
    {
        return new QuoteLineItemResponse
        {
            Id = item.Id,
            QuoteId = item.QuoteId,
            Type = item.Type,
            Description = item.Description,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            VatRate = item.VatRate,
            LineTotal = item.LineTotal
        };
    }

    private static object ToJobCreatedResponse(Job job)
    {
        return new
        {
            job.Id,
            job.Customer,
            job.Phone,
            job.JobTitle,
            job.Address,
            job.ScheduledDate,
            job.Status,
            job.Priority,
            job.Notes,
            job.QuoteId,
            job.EngineerId,
            SourceQuote = (object?)null
        };
    }
}
