using System.Data;
using System.Data.Common;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/customer-staff/teams")]
public sealed class CustomerStaffTeamsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public CustomerStaffTeamsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTeam(int id, CreateCustomerTeamRequest request)
    {
        var companyUserId = GetCompanyUserId();
        var entitlements = PlanEntitlements.ForPlan(await LoadPlanAsync(companyUserId));

        if (!entitlements.TeamsEnabled)
        {
            return BadRequest(new { error = $"The {entitlements.PlanName} plan does not include teams. Upgrade to Team or above to edit teams." });
        }

        await ExecuteNonQueryAsync(
            """
            UPDATE CustomerStaffTeams
            SET Name = @Name,
                Description = @Description,
                Colour = @Colour,
                TeamLeadStaffId = @TeamLeadStaffId,
                DefaultJobType = @DefaultJobType,
                ServiceArea = @ServiceArea,
                WorkingHours = @WorkingHours,
                UpdatedAt = @UpdatedAt
            WHERE Id = @Id AND CompanyUserId = @CompanyUserId
            """,
            ("@Id", id),
            ("@CompanyUserId", companyUserId),
            ("@Name", CleanRequired(request.Name, "Team name", 120)),
            ("@Description", CleanOptional(request.Description, 500) ?? string.Empty),
            ("@Colour", CleanOptional(request.Colour, 40) ?? "blue"),
            ("@TeamLeadStaffId", request.TeamLeadStaffId),
            ("@DefaultJobType", CleanOptional(request.DefaultJobType, 120) ?? string.Empty),
            ("@ServiceArea", CleanOptional(request.ServiceArea, 250) ?? string.Empty),
            ("@WorkingHours", CleanOptional(request.WorkingHours, 250) ?? string.Empty),
            ("@UpdatedAt", DateTime.UtcNow));

        return NoContent();
    }

    private async Task<string> LoadPlanAsync(int companyUserId)
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            await EnsureOpenAsync(connection);
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT TOP 1 SubscriptionPlan FROM Users WHERE Id = @Id";
            AddParameters(command, ("@Id", companyUserId));
            var result = await command.ExecuteScalarAsync();
            return result?.ToString() ?? "Solo";
        }
        catch
        {
            return "Solo";
        }
    }

    private int GetCompanyUserId()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(id, out var parsed) ? parsed : 0;
    }

    private async Task<int> ExecuteNonQueryAsync(string commandText, params (string Name, object? Value)[] parameters)
    {
        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);
        await using var command = connection.CreateCommand();
        command.CommandText = commandText;
        AddParameters(command, parameters);
        return await command.ExecuteNonQueryAsync();
    }

    private static async Task EnsureOpenAsync(DbConnection connection)
    {
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }
    }

    private static void AddParameters(DbCommand command, params (string Name, object? Value)[] parameters)
    {
        foreach (var parameter in parameters)
        {
            var dbParameter = command.CreateParameter();
            dbParameter.ParameterName = parameter.Name;
            dbParameter.Value = parameter.Value ?? DBNull.Value;
            command.Parameters.Add(dbParameter);
        }
    }

    private static string CleanRequired(string value, string label, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException($"{label} is required.");
        var cleaned = value.Trim();
        if (cleaned.Length > maxLength) throw new ArgumentException($"{label} cannot be longer than {maxLength} characters.");
        return cleaned;
    }

    private static string? CleanOptional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var cleaned = value.Trim();
        return cleaned.Length > maxLength ? cleaned[..maxLength] : cleaned;
    }
}
