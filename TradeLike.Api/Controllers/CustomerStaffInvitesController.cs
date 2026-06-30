using System.Data;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/customer-staff-invites")]
public sealed class CustomerStaffInvitesController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public CustomerStaffInvitesController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet("preview")]
    public async Task<ActionResult<CustomerStaffInvitePreviewResponse>> Preview([FromQuery] string token)
    {
        await EnsureOpenAsync(_context.Database.GetDbConnection());
        var invite = await FindInviteAsync(token);
        return invite is null ? NotFound(new { error = "Invite not found or expired." }) : Ok(invite);
    }

    [HttpPost("accept")]
    public async Task<ActionResult<CustomerStaffInvitePreviewResponse>> Accept(AcceptCustomerStaffInviteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return BadRequest(new { error = "Enter the invite token and a password of at least 8 characters." });
        }

        var invite = await FindInviteAsync(request.Token);
        if (invite is null)
        {
            return NotFound(new { error = "Invite not found or expired." });
        }

        await ExecuteNonQueryAsync(
            """
            UPDATE CustomerStaffMembers
            SET Status = 'Active',
                InviteAcceptedAt = @InviteAcceptedAt,
                UpdatedAt = @UpdatedAt
            WHERE InviteToken = @InviteToken
            """,
            ("@InviteToken", request.Token.Trim()),
            ("@InviteAcceptedAt", DateTime.UtcNow),
            ("@UpdatedAt", DateTime.UtcNow));

        return Ok(await FindInviteAsync(request.Token));
    }

    private async Task<CustomerStaffInvitePreviewResponse?> FindInviteAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT TOP 1 Id, FirstName, LastName, Email, RoleName, Status, InviteSentAt, InviteAcceptedAt
            FROM CustomerStaffMembers
            WHERE InviteToken = @InviteToken
            """;
        AddParameters(command, ("@InviteToken", token.Trim()));

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new CustomerStaffInvitePreviewResponse(
            reader.GetInt32(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetDateTime(6),
            reader.IsDBNull(7) ? null : reader.GetDateTime(7));
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
}

public sealed record CustomerStaffInvitePreviewResponse(int Id, string FirstName, string LastName, string Email, string RoleName, string Status, DateTime? InviteSentAt, DateTime? InviteAcceptedAt);

public sealed record AcceptCustomerStaffInviteRequest(string Token, string Password);
