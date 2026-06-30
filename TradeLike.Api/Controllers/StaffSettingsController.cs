using System.Data;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Contracts.Settings;
using TradeLike.Api.Data;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/staff-settings")]
public class StaffSettingsController : ControllerBase
{
    private static readonly string[] PermissionGroups =
    [
        "Full access",
        "Customer accounts",
        "Customer notes",
        "Jobs and scheduling",
        "Quotes and invoices",
        "Billing and subscriptions",
        "Discounts and free months",
        "Password resets",
        "Email customers",
        "Staff management",
        "Staff invites",
        "Security logs",
        "Audit logs",
        "Data exports",
        "Customer impersonation"
    ];

    private static readonly IReadOnlyList<(string Name, string Description)> DefaultCategories =
    [
        ("Leadership", "Owners, directors, and senior decision makers"),
        ("Admin & Operations", "Office managers, operations coordinators, and general admin staff"),
        ("Scheduling & Dispatch", "People assigning jobs, engineers, calendars, and daily routes"),
        ("Customer Support", "Customer-facing support, service updates, and account help"),
        ("Engineers", "Field engineers, tradespeople, apprentices, and on-site workers"),
        ("Field Supervisors", "Senior engineers or supervisors managing work quality and teams"),
        ("Accounts & Billing", "Invoices, payments, subscriptions, and finance admin"),
        ("Marketing", "Campaigns, emails, discounts, and customer growth"),
        ("Personal Assistants", "PA users attached to a director, manager, or senior staff member"),
        ("Subcontractors", "Limited-access external workers or partner trades")
    ];

    private static readonly IReadOnlyList<(string Name, string Category, string[] Permissions)> DefaultRolePresets =
    [
        ("Director / Owner", "Leadership", ["Full access"]),
        ("Office Manager", "Admin & Operations", ["Customer accounts", "Jobs and scheduling", "Quotes and invoices", "Staff invites"]),
        ("Operations Coordinator", "Admin & Operations", ["Customer accounts", "Jobs and scheduling", "Customer notes"]),
        ("Scheduler / Dispatcher", "Scheduling & Dispatch", ["Jobs and scheduling", "Customer accounts", "Customer notes"]),
        ("Customer Support", "Customer Support", ["Customer accounts", "Customer notes", "Password resets", "Email customers"]),
        ("Lead Engineer", "Field Supervisors", ["Jobs and scheduling", "Customer notes", "Quotes and invoices"]),
        ("Engineer", "Engineers", ["Jobs and scheduling", "Customer notes"]),
        ("Apprentice / Junior Engineer", "Engineers", ["Jobs and scheduling"]),
        ("Accounts / Billing", "Accounts & Billing", ["Quotes and invoices", "Billing and subscriptions"]),
        ("Marketing", "Marketing", ["Discounts and free months", "Email customers", "Customer notes"]),
        ("Personal Assistant", "Personal Assistants", ["Customer accounts", "Customer notes", "Jobs and scheduling"]),
        ("Subcontractor", "Subcontractors", ["Jobs and scheduling"])
    ];

    private readonly TradeLikeDbContext _context;

    public StaffSettingsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<StaffSettingsResponse>> Get()
    {
        await EnsureSeedDataAsync();
        return Ok(await LoadSettingsAsync());
    }

    [HttpPost("categories")]
    public async Task<ActionResult<StaffSettingsResponse>> CreateCategory(
        [FromBody] CreateStaffCategoryRequest request)
    {
        var name = CleanRequired(request.Name, "Category name", 120);
        var description = CleanOptional(request.Description, 500) ?? "Custom staff category";
        var normalizedName = Normalize(name);
        var now = DateTime.UtcNow;

        if (await CategoryExistsAsync(normalizedName))
        {
            return BadRequest(new { error = "A staff category with this name already exists." });
        }

        await ExecuteNonQueryAsync(
            """
            INSERT INTO StaffCategories (Name, Description, NormalizedName, CreatedAt, UpdatedAt)
            VALUES (@Name, @Description, @NormalizedName, @CreatedAt, @UpdatedAt)
            """,
            ("@Name", name),
            ("@Description", description),
            ("@NormalizedName", normalizedName),
            ("@CreatedAt", now),
            ("@UpdatedAt", now));

        return Ok(await LoadSettingsAsync());
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<ActionResult<StaffSettingsResponse>> DeleteCategory(int id)
    {
        var affected = await ExecuteNonQueryAsync(
            "DELETE FROM StaffCategories WHERE Id = @Id",
            ("@Id", id));

        if (affected == 0)
        {
            return NotFound(new { error = "Staff category not found." });
        }

        return Ok(await LoadSettingsAsync());
    }

    [HttpPost("role-presets")]
    public async Task<ActionResult<StaffSettingsResponse>> CreateRolePreset(
        [FromBody] CreateStaffRolePresetRequest request)
    {
        var name = CleanRequired(request.Name, "Role preset name", 120);
        var normalizedName = Normalize(name);
        var permissions = CleanPermissions(request.Permissions);

        if (permissions.Count == 0)
        {
            return BadRequest(new { error = "Choose at least one permission." });
        }

        if (await RolePresetExistsAsync(normalizedName))
        {
            return BadRequest(new { error = "A role preset with this name already exists." });
        }

        if (!await CategoryIdExistsAsync(request.CategoryId))
        {
            return BadRequest(new { error = "Choose a valid staff category." });
        }

        var now = DateTime.UtcNow;
        var rolePresetId = await ExecuteScalarIntAsync(
            """
            INSERT INTO StaffRolePresets (Name, NormalizedName, CategoryId, CreatedAt, UpdatedAt)
            OUTPUT INSERTED.Id
            VALUES (@Name, @NormalizedName, @CategoryId, @CreatedAt, @UpdatedAt)
            """,
            ("@Name", name),
            ("@NormalizedName", normalizedName),
            ("@CategoryId", request.CategoryId),
            ("@CreatedAt", now),
            ("@UpdatedAt", now));

        foreach (var permission in permissions)
        {
            await ExecuteNonQueryAsync(
                """
                INSERT INTO StaffRolePresetPermissions (RolePresetId, PermissionName)
                VALUES (@RolePresetId, @PermissionName)
                """,
                ("@RolePresetId", rolePresetId),
                ("@PermissionName", permission));
        }

        return Ok(await LoadSettingsAsync());
    }

    [HttpDelete("role-presets/{id:int}")]
    public async Task<ActionResult<StaffSettingsResponse>> DeleteRolePreset(int id)
    {
        var affected = await ExecuteNonQueryAsync(
            "DELETE FROM StaffRolePresets WHERE Id = @Id",
            ("@Id", id));

        if (affected == 0)
        {
            return NotFound(new { error = "Role preset not found." });
        }

        return Ok(await LoadSettingsAsync());
    }

    private async Task EnsureSeedDataAsync()
    {
        if (await ExecuteScalarIntAsync("SELECT COUNT(1) FROM StaffCategories") == 0)
        {
            foreach (var category in DefaultCategories)
            {
                await ExecuteNonQueryAsync(
                    """
                    INSERT INTO StaffCategories (Name, Description, NormalizedName, CreatedAt, UpdatedAt)
                    VALUES (@Name, @Description, @NormalizedName, @CreatedAt, @UpdatedAt)
                    """,
                    ("@Name", category.Name),
                    ("@Description", category.Description),
                    ("@NormalizedName", Normalize(category.Name)),
                    ("@CreatedAt", DateTime.UtcNow),
                    ("@UpdatedAt", DateTime.UtcNow));
            }
        }

        if (await ExecuteScalarIntAsync("SELECT COUNT(1) FROM StaffRolePresets") > 0)
        {
            return;
        }

        foreach (var rolePreset in DefaultRolePresets)
        {
            var categoryId = await ExecuteScalarIntAsync(
                "SELECT Id FROM StaffCategories WHERE NormalizedName = @NormalizedName",
                ("@NormalizedName", Normalize(rolePreset.Category)));

            var rolePresetId = await ExecuteScalarIntAsync(
                """
                INSERT INTO StaffRolePresets (Name, NormalizedName, CategoryId, CreatedAt, UpdatedAt)
                OUTPUT INSERTED.Id
                VALUES (@Name, @NormalizedName, @CategoryId, @CreatedAt, @UpdatedAt)
                """,
                ("@Name", rolePreset.Name),
                ("@NormalizedName", Normalize(rolePreset.Name)),
                ("@CategoryId", categoryId),
                ("@CreatedAt", DateTime.UtcNow),
                ("@UpdatedAt", DateTime.UtcNow));

            foreach (var permission in rolePreset.Permissions)
            {
                await ExecuteNonQueryAsync(
                    """
                    INSERT INTO StaffRolePresetPermissions (RolePresetId, PermissionName)
                    VALUES (@RolePresetId, @PermissionName)
                    """,
                    ("@RolePresetId", rolePresetId),
                    ("@PermissionName", permission));
            }
        }
    }

    private async Task<StaffSettingsResponse> LoadSettingsAsync()
    {
        var categories = await LoadCategoriesAsync();
        var rolePresets = await LoadRolePresetsAsync();

        return new StaffSettingsResponse(
            categories,
            rolePresets,
            PermissionGroups);
    }

    private async Task<IReadOnlyList<StaffCategoryResponse>> LoadCategoriesAsync()
    {
        var rows = new List<StaffCategoryResponse>();
        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, Name, Description, CreatedAt, UpdatedAt
            FROM StaffCategories
            ORDER BY Id
            """;

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new StaffCategoryResponse(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDateTime(3),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4)));
        }

        return rows;
    }

    private async Task<IReadOnlyList<StaffRolePresetResponse>> LoadRolePresetsAsync()
    {
        var roleRows = new Dictionary<int, RolePresetRow>();
        var connection = _context.Database.GetDbConnection();
        await EnsureOpenAsync(connection);

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                SELECT r.Id, r.Name, r.CategoryId, c.Name, r.CreatedAt, r.UpdatedAt
                FROM StaffRolePresets r
                INNER JOIN StaffCategories c ON c.Id = r.CategoryId
                ORDER BY r.Id
                """;

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var id = reader.GetInt32(0);
                roleRows[id] = new RolePresetRow(
                    id,
                    reader.GetString(1),
                    reader.GetInt32(2),
                    reader.GetString(3),
                    reader.GetDateTime(4),
                    reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    []);
            }
        }

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                SELECT RolePresetId, PermissionName
                FROM StaffRolePresetPermissions
                ORDER BY Id
                """;

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var rolePresetId = reader.GetInt32(0);
                if (roleRows.TryGetValue(rolePresetId, out var rolePreset))
                {
                    rolePreset.Permissions.Add(reader.GetString(1));
                }
            }
        }

        return roleRows.Values
            .Select(role => new StaffRolePresetResponse(
                role.Id,
                role.Name,
                role.CategoryId,
                role.CategoryName,
                role.Permissions,
                role.CreatedAt,
                role.UpdatedAt))
            .ToList();
    }

    private async Task<bool> CategoryExistsAsync(string normalizedName)
    {
        return await ExecuteScalarIntAsync(
            "SELECT COUNT(1) FROM StaffCategories WHERE NormalizedName = @NormalizedName",
            ("@NormalizedName", normalizedName)) > 0;
    }

    private async Task<bool> CategoryIdExistsAsync(int id)
    {
        return await ExecuteScalarIntAsync(
            "SELECT COUNT(1) FROM StaffCategories WHERE Id = @Id",
            ("@Id", id)) > 0;
    }

    private async Task<bool> RolePresetExistsAsync(string normalizedName)
    {
        return await ExecuteScalarIntAsync(
            "SELECT COUNT(1) FROM StaffRolePresets WHERE NormalizedName = @NormalizedName",
            ("@NormalizedName", normalizedName)) > 0;
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
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException($"{label} is required.");
        }

        var cleaned = value.Trim();
        if (cleaned.Length > maxLength)
        {
            throw new ArgumentException($"{label} cannot be longer than {maxLength} characters.");
        }

        return cleaned;
    }

    private static string? CleanOptional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var cleaned = value.Trim();
        if (cleaned.Length > maxLength)
        {
            throw new ArgumentException($"Description cannot be longer than {maxLength} characters.");
        }

        return cleaned;
    }

    private static IReadOnlyList<string> CleanPermissions(IReadOnlyList<string>? permissions)
    {
        return (permissions ?? [])
            .Select(permission => permission.Trim())
            .Where(permission => permission.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(50)
            .ToList();
    }

    private static string Normalize(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private sealed record RolePresetRow(
        int Id,
        string Name,
        int CategoryId,
        string CategoryName,
        DateTime CreatedAt,
        DateTime? UpdatedAt,
        List<string> Permissions);
}
