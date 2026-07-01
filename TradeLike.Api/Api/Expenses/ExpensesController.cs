using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Models;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.Expenses;

[ApiController]
[Route("api/expenses")]
[Authorize(Policy = "RequireEmployeeRole")]
public class ExpensesController : ControllerBase
{
    private const int DefaultMileagePencePerMile = 45;
    private readonly TradeLikeDbContext _db;

    public ExpensesController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ExpenseResponse>>> GetExpenses(
        [FromQuery] int? staffId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? category,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var query = _db.Expenses.AsNoTracking().Where(expense => expense.TenantId == tenantId);

        if (staffId is > 0)
        {
            query = query.Where(expense => expense.StaffId == staffId.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(expense => expense.DateUtc >= from.Value.Date);
        }

        if (to.HasValue)
        {
            query = query.Where(expense => expense.DateUtc < to.Value.Date.AddDays(1));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            if (!TryParseCategory(category, out var parsedCategory))
            {
                return BadRequest(new { error = "Invalid expense category." });
            }

            query = query.Where(expense => expense.Category == parsedCategory);
        }

        var expenses = await query
            .OrderByDescending(expense => expense.DateUtc)
            .ThenByDescending(expense => expense.Id)
            .Select(expense => ToResponse(expense))
            .ToListAsync(cancellationToken);

        return Ok(expenses);
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseResponse>> CreateExpense(
        SaveExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var validation = await ValidateExpenseAsync(tenantId, request, cancellationToken);
        if (validation.Error is not null)
        {
            return BadRequest(new { error = validation.Error });
        }

        var expense = new Expense
        {
            TenantId = tenantId,
            StaffId = request.StaffId.GetValueOrDefault(GetUserId()),
            DateUtc = request.DateUtc!.Value.ToUniversalTime(),
            Category = validation.Category!.Value,
            AmountPence = validation.AmountPence,
            Description = request.Description.Trim(),
            ReceiptFileId = request.ReceiptFileId,
            Miles = request.Miles,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetExpenses), new { id = expense.Id }, ToResponse(expense));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ExpenseResponse>> UpdateExpense(
        int id,
        SaveExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var expense = await _db.Expenses.FirstOrDefaultAsync(
            item => item.Id == id && item.TenantId == tenantId,
            cancellationToken);

        if (expense is null)
        {
            return NotFound();
        }

        var validation = await ValidateExpenseAsync(tenantId, request, cancellationToken);
        if (validation.Error is not null)
        {
            return BadRequest(new { error = validation.Error });
        }

        expense.StaffId = request.StaffId.GetValueOrDefault(GetUserId());
        expense.DateUtc = request.DateUtc!.Value.ToUniversalTime();
        expense.Category = validation.Category!.Value;
        expense.AmountPence = validation.AmountPence;
        expense.Description = request.Description.Trim();
        expense.ReceiptFileId = request.ReceiptFileId;
        expense.Miles = request.Miles;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(expense));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteExpense(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var expense = await _db.Expenses.FirstOrDefaultAsync(
            item => item.Id == id && item.TenantId == tenantId,
            cancellationToken);

        if (expense is null)
        {
            return NotFound();
        }

        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<ActionResult<IReadOnlyList<ExpenseSummaryResponse>>> GetSummary(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        if (!from.HasValue || !to.HasValue || from.Value.Date > to.Value.Date)
        {
            return BadRequest(new { error = "A valid from and to date range is required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var endExclusive = to.Value.Date.AddDays(1);
        var rows = await _db.Expenses
            .AsNoTracking()
            .Where(expense => expense.TenantId == tenantId &&
                expense.DateUtc >= from.Value.Date &&
                expense.DateUtc < endExclusive)
            .GroupBy(expense => expense.Category)
            .Select(group => new ExpenseSummaryResponse(group.Key.ToString(), group.Sum(expense => expense.AmountPence)))
            .OrderBy(item => item.Category)
            .ToListAsync(cancellationToken);

        return Ok(rows);
    }

    private async Task<ExpenseValidationResult> ValidateExpenseAsync(
        int tenantId,
        SaveExpenseRequest request,
        CancellationToken cancellationToken)
    {
        if (request.DateUtc is null || request.DateUtc.Value == default)
        {
            return ExpenseValidationResult.Invalid("Expense date is required.");
        }

        if (!TryParseCategory(request.Category, out var category))
        {
            return ExpenseValidationResult.Invalid("Invalid expense category.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return ExpenseValidationResult.Invalid("Description is required.");
        }

        if (category == ExpenseCategory.Mileage)
        {
            if (request.Miles is null or <= 0)
            {
                return ExpenseValidationResult.Invalid("Miles are required for mileage expenses.");
            }

            var pencePerMile = await GetMileageRateAsync(tenantId, request.DateUtc.Value, cancellationToken);
            var amount = (int)Math.Round(request.Miles.Value * pencePerMile, MidpointRounding.AwayFromZero);
            return ExpenseValidationResult.Valid(category, amount);
        }

        if (request.AmountPence is null or <= 0)
        {
            return ExpenseValidationResult.Invalid("Amount is required for this expense category.");
        }

        return ExpenseValidationResult.Valid(category, request.AmountPence.Value);
    }

    private async Task<int> GetMileageRateAsync(int tenantId, DateTime dateUtc, CancellationToken cancellationToken)
    {
        var rate = await _db.MileageRates
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId && item.EffectiveFromUtc <= dateUtc)
            .OrderByDescending(item => item.EffectiveFromUtc)
            .Select(item => (int?)item.PencePerMile)
            .FirstOrDefaultAsync(cancellationToken);

        return rate ?? DefaultMileagePencePerMile;
    }

    private int GetUserId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) && userId > 0
            ? userId
            : TenantHelpers.GetTenantId(HttpContext);
    }

    private static bool TryParseCategory(string? value, out ExpenseCategory category)
    {
        return Enum.TryParse(value, ignoreCase: true, out category) &&
            Enum.IsDefined(typeof(ExpenseCategory), category);
    }

    private static ExpenseResponse ToResponse(Expense expense)
    {
        return new ExpenseResponse(
            expense.Id,
            expense.StaffId,
            expense.DateUtc,
            expense.Category.ToString(),
            expense.AmountPence,
            expense.Description,
            expense.ReceiptFileId,
            expense.Miles,
            expense.CreatedAtUtc);
    }
}

public sealed record SaveExpenseRequest(
    int? StaffId,
    DateTime? DateUtc,
    string Category,
    int? AmountPence,
    string Description,
    int? ReceiptFileId,
    decimal? Miles);

public sealed record ExpenseResponse(
    int Id,
    int StaffId,
    DateTime DateUtc,
    string Category,
    int AmountPence,
    string Description,
    int? ReceiptFileId,
    decimal? Miles,
    DateTime CreatedAtUtc);

public sealed record ExpenseSummaryResponse(string Category, int TotalPence);

internal sealed record ExpenseValidationResult(string? Error, ExpenseCategory? Category, int AmountPence)
{
    public static ExpenseValidationResult Invalid(string error) => new(error, null, 0);

    public static ExpenseValidationResult Valid(ExpenseCategory category, int amountPence) => new(null, category, amountPence);
}
