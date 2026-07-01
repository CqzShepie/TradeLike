using System.Data;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireStaffRole")]
[Route("api/job-assignments")]
public sealed class JobAssignmentsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public JobAssignmentsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<JobAssignmentResponse>>> GetAssignments()
    {
        await EnsureSchemaAsync();
        return Ok(await LoadAssignmentsAsync(false));
    }

    [HttpGet("previous")]
    public async Task<ActionResult<IReadOnlyList<JobAssignmentResponse>>> GetPreviousAssignments()
    {
        await EnsureSchemaAsync();
        return Ok(await LoadAssignmentsAsync(true));
    }

    [HttpPut("{jobId:int}")]
    public async Task<ActionResult<IReadOnlyList<JobAssignmentResponse>>> UpdateAssignment(int jobId, UpdateJobAssignmentRequest request)
    {
        await EnsureSchemaAsync();
        var staffIds = (request.AssignedStaffMemberIds ?? []).Where(id => id > 0).Distinct().ToList();

        await ExecuteNonQueryAsync(
            """
            UPDATE Jobs
            SET AssignedTeamId = @AssignedTeamId,
                LeadStaffMemberId = @LeadStaffMemberId,
                AssignedStaffMemberIds = @AssignedStaffMemberIds,
                ScheduledEndDate = @ScheduledEndDate,
                CalendarColour = @CalendarColour
            WHERE Id = @JobId
            """,
            ("@JobId", jobId),
            ("@AssignedTeamId", request.AssignedTeamId),
            ("@LeadStaffMemberId", request.LeadStaffMemberId),
            ("@AssignedStaffMemberIds", string.Join(',', staffIds)),
            ("@ScheduledEndDate", request.ScheduledEndDate),
            ("@CalendarColour", string.IsNullOrWhiteSpace(request.CalendarColour) ? "blue" : request.CalendarColour.Trim()));

        return Ok(await LoadAssignmentsAsync(false));
    }

    private async Task<IReadOnlyList<JobAssignmentResponse>> LoadAssignmentsAsync(bool previousOnly)
    {
        var rows = new List<JobAssignmentResponse>();
        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);

        await using var command = connection.CreateCommand();
        command.CommandText = previousOnly
            ? """
              SELECT Id, AssignedTeamId, LeadStaffMemberId, AssignedStaffMemberIds, ScheduledEndDate, CalendarColour
              FROM Jobs
              WHERE Status IN ('Completed', 'Cancelled') OR ScheduledDate < @Today
              ORDER BY ScheduledDate DESC
              """
            : """
              SELECT Id, AssignedTeamId, LeadStaffMemberId, AssignedStaffMemberIds, ScheduledEndDate, CalendarColour
              FROM Jobs
              ORDER BY ScheduledDate
              """;

        if (previousOnly)
        {
            AddParameters(command, ("@Today", DateTime.Today));
        }

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new JobAssignmentResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.IsDBNull(2) ? null : reader.GetInt32(2),
                ParseIds(reader.IsDBNull(3) ? string.Empty : reader.GetString(3)),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                reader.IsDBNull(5) ? null : reader.GetString(5)));
        }

        return rows;
    }

    private async Task EnsureSchemaAsync()
    {
        await ExecuteNonQueryAsync(
            """
            IF COL_LENGTH('Jobs', 'AssignedTeamId') IS NULL
            BEGIN
                ALTER TABLE Jobs ADD AssignedTeamId int NULL;
            END;

            IF COL_LENGTH('Jobs', 'LeadStaffMemberId') IS NULL
            BEGIN
                ALTER TABLE Jobs ADD LeadStaffMemberId int NULL;
            END;

            IF COL_LENGTH('Jobs', 'AssignedStaffMemberIds') IS NULL
            BEGIN
                ALTER TABLE Jobs ADD AssignedStaffMemberIds nvarchar(max) NULL;
            END;

            IF COL_LENGTH('Jobs', 'ScheduledEndDate') IS NULL
            BEGIN
                ALTER TABLE Jobs ADD ScheduledEndDate datetime2 NULL;
            END;

            IF COL_LENGTH('Jobs', 'CalendarColour') IS NULL
            BEGIN
                ALTER TABLE Jobs ADD CalendarColour nvarchar(40) NULL;
            END;
            """);
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

    private static List<int> ParseIds(string value)
    {
        return value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(item => int.TryParse(item, out var id) ? id : 0)
            .Where(id => id > 0)
            .Distinct()
            .ToList();
    }
}

public sealed record JobAssignmentResponse(int JobId, int? AssignedTeamId, int? LeadStaffMemberId, IReadOnlyList<int> AssignedStaffMemberIds, DateTime? ScheduledEndDate, string? CalendarColour);

public sealed record UpdateJobAssignmentRequest(int? AssignedTeamId, int? LeadStaffMemberId, IReadOnlyList<int>? AssignedStaffMemberIds, DateTime? ScheduledEndDate, string? CalendarColour);
