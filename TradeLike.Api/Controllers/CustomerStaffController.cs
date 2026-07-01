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
[Route("api/customer-staff")]
public sealed class CustomerStaffController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public CustomerStaffController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<CustomerStaffWorkspaceResponse>> GetWorkspace()
    {
        return Ok(await LoadWorkspaceAsync());
    }

    [HttpPost("teams")]
    public async Task<ActionResult<CustomerStaffWorkspaceResponse>> CreateTeam(CreateCustomerTeamRequest request)
    {
        var companyUserId = GetCompanyUserId();
        var entitlements = await GetPlanEntitlementsAsync(companyUserId);

        if (!entitlements.TeamsEnabled)
        {
            return BadRequest(new { error = $"The {entitlements.PlanName} plan does not include teams. Upgrade to Team or above to create teams." });
        }

        var now = DateTime.UtcNow;
        var name = CleanRequired(request.Name, "Team name", 120);
        var colour = CleanOptional(request.Colour, 40) ?? "blue";

        await ExecuteNonQueryAsync(
            """
            INSERT INTO CustomerStaffTeams
                (CompanyUserId, Name, Description, Colour, TeamLeadStaffId, DefaultJobType, ServiceArea, WorkingHours, CreatedAt, UpdatedAt)
            VALUES
                (@CompanyUserId, @Name, @Description, @Colour, @TeamLeadStaffId, @DefaultJobType, @ServiceArea, @WorkingHours, @CreatedAt, @UpdatedAt)
            """,
            ("@CompanyUserId", companyUserId),
            ("@Name", name),
            ("@Description", CleanOptional(request.Description, 500) ?? string.Empty),
            ("@Colour", colour),
            ("@TeamLeadStaffId", request.TeamLeadStaffId),
            ("@DefaultJobType", CleanOptional(request.DefaultJobType, 120) ?? string.Empty),
            ("@ServiceArea", CleanOptional(request.ServiceArea, 250) ?? string.Empty),
            ("@WorkingHours", CleanOptional(request.WorkingHours, 250) ?? string.Empty),
            ("@CreatedAt", now),
            ("@UpdatedAt", now));

        return Ok(await LoadWorkspaceAsync());
    }

    [HttpDelete("teams/{id:int}")]
    public async Task<ActionResult<CustomerStaffWorkspaceResponse>> DeleteTeam(int id)
    {
        var companyUserId = GetCompanyUserId();

        await ExecuteNonQueryAsync(
            """
            DELETE mt
            FROM CustomerStaffMemberTeams mt
            INNER JOIN CustomerStaffTeams t ON t.Id = mt.TeamId
            WHERE mt.TeamId = @TeamId AND t.CompanyUserId = @CompanyUserId
            """,
            ("@TeamId", id),
            ("@CompanyUserId", companyUserId));

        await ExecuteNonQueryAsync(
            "DELETE FROM CustomerStaffTeams WHERE Id = @Id AND CompanyUserId = @CompanyUserId",
            ("@Id", id),
            ("@CompanyUserId", companyUserId));

        return Ok(await LoadWorkspaceAsync());
    }

    [HttpPost("members")]
    public async Task<ActionResult<CreateCustomerStaffMemberResponse>> CreateMember(CreateCustomerStaffMemberRequest request)
    {
        var companyUserId = GetCompanyUserId();
        var entitlements = await GetPlanEntitlementsAsync(companyUserId);
        var currentUserCount = await CountBillableMembersAsync(companyUserId);

        if (entitlements.MaxUsers.HasValue && currentUserCount >= entitlements.MaxUsers.Value)
        {
            return BadRequest(new { error = $"Your {entitlements.PlanName} plan allows {entitlements.MaxUsers.Value} user{(entitlements.MaxUsers.Value == 1 ? string.Empty : "s")}. Upgrade before inviting more staff." });
        }

        if (!entitlements.TeamsEnabled && (request.TeamIds?.Any(id => id > 0) ?? false))
        {
            return BadRequest(new { error = $"The {entitlements.PlanName} plan does not include teams. Upgrade to Team or above to assign workers to teams." });
        }

        var firstName = CleanRequired(request.FirstName, "First name", 100);
        var lastName = CleanRequired(request.LastName, "Last name", 100);
        var email = CleanRequired(request.Email, "Email", 256).ToLowerInvariant();
        var roleName = CleanRequired(request.RoleName, "Role", 120);

        if (await EmailExistsAsync(companyUserId, email))
        {
            return BadRequest(new { error = "A staff member with this email already exists for this company." });
        }

        var now = DateTime.UtcNow;
        var token = Guid.NewGuid().ToString("N");

        var memberId = await ExecuteScalarIntAsync(
            """
            INSERT INTO CustomerStaffMembers
                (CompanyUserId, FirstName, LastName, Email, Phone, RoleName, Status, PermissionPresetName, Skills, ServiceArea, WorkingHours, CalendarColour, IsTwoFactorRequired, LastLoginAt, InviteToken, InviteSentAt, InviteAcceptedAt, ResetPasswordRequestedAt, CreatedAt, UpdatedAt)
            OUTPUT INSERTED.Id
            VALUES
                (@CompanyUserId, @FirstName, @LastName, @Email, @Phone, @RoleName, 'InvitePending', @PermissionPresetName, @Skills, @ServiceArea, @WorkingHours, @CalendarColour, 0, NULL, @InviteToken, @InviteSentAt, NULL, NULL, @CreatedAt, @UpdatedAt)
            """,
            ("@CompanyUserId", companyUserId),
            ("@FirstName", firstName),
            ("@LastName", lastName),
            ("@Email", email),
            ("@Phone", CleanOptional(request.Phone, 80) ?? string.Empty),
            ("@RoleName", roleName),
            ("@PermissionPresetName", CleanOptional(request.PermissionPresetName, 120) ?? roleName),
            ("@Skills", CleanOptional(request.Skills, 500) ?? string.Empty),
            ("@ServiceArea", CleanOptional(request.ServiceArea, 250) ?? string.Empty),
            ("@WorkingHours", CleanOptional(request.WorkingHours, 250) ?? string.Empty),
            ("@CalendarColour", CleanOptional(request.CalendarColour, 40) ?? "blue"),
            ("@InviteToken", token),
            ("@InviteSentAt", now),
            ("@CreatedAt", now),
            ("@UpdatedAt", now));

        await ReplaceMemberTeamsAsync(memberId, companyUserId, request.TeamIds);

        var workspace = await LoadWorkspaceAsync();
        var origin = Request.Headers.Origin.FirstOrDefault() ?? Request.Headers.Referer.FirstOrDefault()?.TrimEnd('/') ?? "http://localhost:5173";
        var inviteLink = $"{origin}/accept-company-staff-invite?token={token}";

        return Ok(new CreateCustomerStaffMemberResponse(workspace, inviteLink));
    }

    [HttpPut("members/{id:int}")]
    public async Task<ActionResult<CustomerStaffWorkspaceResponse>> UpdateMember(int id, UpdateCustomerStaffMemberRequest request)
    {
        var companyUserId = GetCompanyUserId();
        var entitlements = await GetPlanEntitlementsAsync(companyUserId);

        if (!entitlements.TeamsEnabled && (request.TeamIds?.Any(teamId => teamId > 0) ?? false))
        {
            return BadRequest(new { error = $"The {entitlements.PlanName} plan does not include teams. Upgrade to Team or above to assign workers to teams." });
        }

        var now = DateTime.UtcNow;
        var email = CleanRequired(request.Email, "Email", 256).ToLowerInvariant();

        if (await EmailExistsAsync(companyUserId, email, id))
        {
            return BadRequest(new { error = "Another staff member already uses this email for this company." });
        }

        await ExecuteNonQueryAsync(
            """
            UPDATE CustomerStaffMembers
            SET FirstName = @FirstName,
                LastName = @LastName,
                Email = @Email,
                Phone = @Phone,
                RoleName = @RoleName,
                Status = @Status,
                PermissionPresetName = @PermissionPresetName,
                Skills = @Skills,
                ServiceArea = @ServiceArea,
                WorkingHours = @WorkingHours,
                CalendarColour = @CalendarColour,
                IsTwoFactorRequired = @IsTwoFactorRequired,
                UpdatedAt = @UpdatedAt
            WHERE Id = @Id AND CompanyUserId = @CompanyUserId
            """,
            ("@Id", id),
            ("@CompanyUserId", companyUserId),
            ("@FirstName", CleanRequired(request.FirstName, "First name", 100)),
            ("@LastName", CleanRequired(request.LastName, "Last name", 100)),
            ("@Email", email),
            ("@Phone", CleanOptional(request.Phone, 80) ?? string.Empty),
            ("@RoleName", CleanRequired(request.RoleName, "Role", 120)),
            ("@Status", CleanStatus(request.Status)),
            ("@PermissionPresetName", CleanOptional(request.PermissionPresetName, 120) ?? request.RoleName),
            ("@Skills", CleanOptional(request.Skills, 500) ?? string.Empty),
            ("@ServiceArea", CleanOptional(request.ServiceArea, 250) ?? string.Empty),
            ("@WorkingHours", CleanOptional(request.WorkingHours, 250) ?? string.Empty),
            ("@CalendarColour", CleanOptional(request.CalendarColour, 40) ?? "blue"),
            ("@IsTwoFactorRequired", request.IsTwoFactorRequired),
            ("@UpdatedAt", now));

        await ReplaceMemberTeamsAsync(id, companyUserId, request.TeamIds);

        return Ok(await LoadWorkspaceAsync());
    }

    [HttpPost("members/{id:int}/reset-password")]
    public async Task<ActionResult<CustomerStaffWorkspaceResponse>> RequestPasswordReset(int id)
    {
        var companyUserId = GetCompanyUserId();
        var now = DateTime.UtcNow;

        await ExecuteNonQueryAsync(
            """
            UPDATE CustomerStaffMembers
            SET ResetPasswordRequestedAt = @ResetPasswordRequestedAt,
                UpdatedAt = @UpdatedAt
            WHERE Id = @Id AND CompanyUserId = @CompanyUserId
            """,
            ("@Id", id),
            ("@CompanyUserId", companyUserId),
            ("@ResetPasswordRequestedAt", now),
            ("@UpdatedAt", now));

        await ExecuteNonQueryAsync(
            """
            INSERT INTO CustomerStaffSecurityRequests
                (CompanyUserId, StaffMemberId, RequestType, Status, CreatedAt)
            SELECT @CompanyUserId, @StaffMemberId, 'PasswordReset', 'Requested', @CreatedAt
            WHERE EXISTS (SELECT 1 FROM CustomerStaffMembers WHERE Id = @StaffMemberId AND CompanyUserId = @CompanyUserId)
            """,
            ("@CompanyUserId", companyUserId),
            ("@StaffMemberId", id),
            ("@CreatedAt", now));

        return Ok(await LoadWorkspaceAsync());
    }

    private async Task<CustomerStaffWorkspaceResponse> LoadWorkspaceAsync()
    {
        var companyUserId = GetCompanyUserId();
        var teams = await LoadTeamsAsync(companyUserId);
        var members = await LoadMembersAsync(companyUserId);
        var entitlements = await GetPlanEntitlementsAsync(companyUserId);

        return new CustomerStaffWorkspaceResponse(teams, members, entitlements, CustomerStaffDefaults.Roles, CustomerStaffDefaults.FutureSecurityItems, CustomerStaffDefaults.QualityOfLifeItems);
    }

    private async Task<IReadOnlyList<CustomerTeamResponse>> LoadTeamsAsync(int companyUserId)
    {
        var teams = new List<CustomerTeamResponse>();
        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, Name, Description, Colour, TeamLeadStaffId, DefaultJobType, ServiceArea, WorkingHours, CreatedAt, UpdatedAt
            FROM CustomerStaffTeams
            WHERE CompanyUserId = @CompanyUserId
            ORDER BY Name
            """;
        AddParameters(command, ("@CompanyUserId", companyUserId));

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            teams.Add(new CustomerTeamResponse(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetInt32(4),
                reader.GetString(5),
                reader.GetString(6),
                reader.GetString(7),
                reader.GetDateTime(8),
                reader.IsDBNull(9) ? null : reader.GetDateTime(9)));
        }

        return teams;
    }

    private async Task<IReadOnlyList<CustomerStaffMemberResponse>> LoadMembersAsync(int companyUserId)
    {
        var members = new Dictionary<int, CustomerStaffMemberResponse>();
        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                SELECT Id, FirstName, LastName, Email, Phone, RoleName, Status, PermissionPresetName, Skills, ServiceArea, WorkingHours, CalendarColour, IsTwoFactorRequired, LastLoginAt, InviteSentAt, InviteAcceptedAt, ResetPasswordRequestedAt, CreatedAt, UpdatedAt
                FROM CustomerStaffMembers
                WHERE CompanyUserId = @CompanyUserId
                ORDER BY Status, LastName, FirstName
                """;
            AddParameters(command, ("@CompanyUserId", companyUserId));

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var id = reader.GetInt32(0);
                members[id] = new CustomerStaffMemberResponse(
                    id,
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetString(3),
                    reader.GetString(4),
                    reader.GetString(5),
                    reader.GetString(6),
                    reader.GetString(7),
                    reader.GetString(8),
                    reader.GetString(9),
                    reader.GetString(10),
                    reader.GetString(11),
                    reader.GetBoolean(12),
                    [],
                    reader.IsDBNull(13) ? null : reader.GetDateTime(13),
                    reader.IsDBNull(14) ? null : reader.GetDateTime(14),
                    reader.IsDBNull(15) ? null : reader.GetDateTime(15),
                    reader.IsDBNull(16) ? null : reader.GetDateTime(16),
                    reader.GetDateTime(17),
                    reader.IsDBNull(18) ? null : reader.GetDateTime(18));
            }
        }

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                SELECT mt.StaffMemberId, mt.TeamId
                FROM CustomerStaffMemberTeams mt
                INNER JOIN CustomerStaffMembers m ON m.Id = mt.StaffMemberId
                WHERE m.CompanyUserId = @CompanyUserId
                ORDER BY mt.TeamId
                """;
            AddParameters(command, ("@CompanyUserId", companyUserId));

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var staffMemberId = reader.GetInt32(0);
                var teamId = reader.GetInt32(1);
                if (members.TryGetValue(staffMemberId, out var member))
                {
                    member.TeamIds.Add(teamId);
                }
            }
        }

        return members.Values.ToList();
    }

    private async Task ReplaceMemberTeamsAsync(int memberId, int companyUserId, IReadOnlyList<int>? teamIds)
    {
        await ExecuteNonQueryAsync(
            """
            DELETE mt
            FROM CustomerStaffMemberTeams mt
            INNER JOIN CustomerStaffMembers m ON m.Id = mt.StaffMemberId
            WHERE mt.StaffMemberId = @StaffMemberId AND m.CompanyUserId = @CompanyUserId
            """,
            ("@StaffMemberId", memberId),
            ("@CompanyUserId", companyUserId));

        foreach (var teamId in (teamIds ?? []).Distinct().Where(id => id > 0))
        {
            await ExecuteNonQueryAsync(
                """
                INSERT INTO CustomerStaffMemberTeams (StaffMemberId, TeamId)
                SELECT @StaffMemberId, @TeamId
                WHERE EXISTS (SELECT 1 FROM CustomerStaffMembers WHERE Id = @StaffMemberId AND CompanyUserId = @CompanyUserId)
                  AND EXISTS (SELECT 1 FROM CustomerStaffTeams WHERE Id = @TeamId AND CompanyUserId = @CompanyUserId)
                  AND NOT EXISTS (SELECT 1 FROM CustomerStaffMemberTeams WHERE StaffMemberId = @StaffMemberId AND TeamId = @TeamId)
                """,
                ("@StaffMemberId", memberId),
                ("@TeamId", teamId),
                ("@CompanyUserId", companyUserId));
        }
    }

    private async Task<PlanEntitlements> GetPlanEntitlementsAsync(int companyUserId)
    {
        return PlanEntitlements.ForPlan(await LoadPlanAsync(companyUserId));
    }

    private async Task<int> CountBillableMembersAsync(int companyUserId)
    {
        return await ExecuteScalarIntAsync(
            """
            SELECT COUNT(*)
            FROM CustomerStaffMembers
            WHERE CompanyUserId = @CompanyUserId AND Status <> 'Left'
            """,
            ("@CompanyUserId", companyUserId));
    }

    private async Task<bool> EmailExistsAsync(int companyUserId, string email, int? excludingMemberId = null)
    {
        var count = await ExecuteScalarIntAsync(
            """
            SELECT COUNT(*)
            FROM CustomerStaffMembers
            WHERE CompanyUserId = @CompanyUserId
              AND LOWER(Email) = @Email
              AND (@ExcludingMemberId IS NULL OR Id <> @ExcludingMemberId)
            """,
            ("@CompanyUserId", companyUserId),
            ("@Email", email.ToLowerInvariant()),
            ("@ExcludingMemberId", excludingMemberId));

        return count > 0;
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

    private async Task<int> ExecuteScalarIntAsync(string commandText, params (string Name, object? Value)[] parameters)
    {
        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);
        await using var command = connection.CreateCommand();
        command.CommandText = commandText;
        AddParameters(command, parameters);
        var result = await command.ExecuteScalarAsync();
        return result is null or DBNull ? 0 : Convert.ToInt32(result);
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

    private static string CleanStatus(string value)
    {
        var cleaned = string.IsNullOrWhiteSpace(value) ? "Active" : value.Trim();
        return new[] { "InvitePending", "Active", "Suspended", "Left" }.Contains(cleaned, StringComparer.OrdinalIgnoreCase) ? cleaned : "Active";
    }
}

public sealed record CustomerStaffWorkspaceResponse(
    IReadOnlyList<CustomerTeamResponse> Teams,
    IReadOnlyList<CustomerStaffMemberResponse> Members,
    PlanEntitlements Entitlements,
    IReadOnlyList<string> RoleOptions,
    IReadOnlyList<string> FutureSecurityItems,
    IReadOnlyList<string> QualityOfLifeItems);

public sealed record CreateCustomerStaffMemberResponse(CustomerStaffWorkspaceResponse Workspace, string InviteLink);

public sealed record CustomerTeamResponse(int Id, string Name, string Description, string Colour, int? TeamLeadStaffId, string DefaultJobType, string ServiceArea, string WorkingHours, DateTime CreatedAt, DateTime? UpdatedAt);

public sealed record CustomerStaffMemberResponse(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string RoleName,
    string Status,
    string PermissionPresetName,
    string Skills,
    string ServiceArea,
    string WorkingHours,
    string CalendarColour,
    bool IsTwoFactorRequired,
    List<int> TeamIds,
    DateTime? LastLoginAt,
    DateTime? InviteSentAt,
    DateTime? InviteAcceptedAt,
    DateTime? ResetPasswordRequestedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record CreateCustomerTeamRequest(string Name, string? Description, string? Colour, int? TeamLeadStaffId, string? DefaultJobType, string? ServiceArea, string? WorkingHours);

public sealed record CreateCustomerStaffMemberRequest(string FirstName, string LastName, string Email, string? Phone, string RoleName, string? PermissionPresetName, IReadOnlyList<int>? TeamIds, string? Skills, string? ServiceArea, string? WorkingHours, string? CalendarColour);

public sealed record UpdateCustomerStaffMemberRequest(string FirstName, string LastName, string Email, string? Phone, string RoleName, string Status, string? PermissionPresetName, IReadOnlyList<int>? TeamIds, string? Skills, string? ServiceArea, string? WorkingHours, string? CalendarColour, bool IsTwoFactorRequired);

public sealed record PlanEntitlements(string PlanName, int? MaxUsers, bool TeamsEnabled, bool StaffSchedulingEnabled, bool AdvancedPermissionsEnabled, bool ReportingEnabled, bool ApiAccessEnabled, string SupportLevel)
{
    public static PlanEntitlements ForPlan(string? plan)
    {
        return (plan ?? "Solo").Trim().ToLowerInvariant() switch
        {
            "team" => new PlanEntitlements("Team", 10, true, true, true, true, false, "Priority email"),
            "business" => new PlanEntitlements("Business", 25, true, true, true, true, true, "Priority + reporting"),
            "enterprise" => new PlanEntitlements("Enterprise", null, true, true, true, true, true, "Dedicated support"),
            "internal" => new PlanEntitlements("Internal", null, true, true, true, true, true, "Internal"),
            _ => new PlanEntitlements("Solo", 1, false, false, false, false, false, "Email")
        };
    }
}

public static class CustomerStaffDefaults
{
    public static readonly IReadOnlyList<string> Roles =
    [
        "Owner / Director",
        "Manager",
        "Office Admin",
        "Scheduler / Dispatcher",
        "Lead Engineer",
        "Engineer",
        "Apprentice",
        "Subcontractor",
        "Accounts / Payments",
        "Customer Support"
    ];

    public static readonly IReadOnlyList<string> FutureSecurityItems =
    [
        "Owner/director 2FA",
        "Optional staff 2FA enforcement",
        "Device and session management",
        "Login history"
    ];

    public static readonly IReadOnlyList<string> QualityOfLifeItems =
    [
        "Unassigned jobs queue",
        "Team colours on calendar",
        "Working hours and holiday visibility",
        "Skill tags and postcode coverage",
        "Double-booking and travel-time warnings",
        "Drag-and-drop calendar reassignment",
        "Engineer status: accepted, en route, on site, completed",
        "Subcontractor limited access"
    ];
}
