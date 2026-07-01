using System.Data;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Inventory;
using TradeLike.Api.Security;

namespace TradeLike.Api.Workflows;

[ApiController]
[Route("api/workflows")]
[Authorize(Policy = "RequireManagerRole")]
public class WorkflowsController : ControllerBase
{
    private const int EngineVersion = 3;
    private readonly TradeLikeDbContext _db;

    public WorkflowsController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet("designer-nodes")]
    public ActionResult<IReadOnlyList<WorkflowNodeDefinition>> GetDesignerNodes()
    {
        return Ok(new[]
        {
            new WorkflowNodeDefinition("Start", "Trigger", "Starts a workflow run.", 1, 1),
            new WorkflowNodeDefinition("Task", "Action", "Runs a single action.", 1, 1),
            new WorkflowNodeDefinition("Decision", "Control", "Branches by condition.", 1, 2),
            new WorkflowNodeDefinition("Fork", "Control", "Runs parallel branches and waits for all branches.", 1, 8),
            new WorkflowNodeDefinition("Loop", "Control", "Repeats child nodes for each item or while a condition passes.", 1, 1),
            new WorkflowNodeDefinition("Join", "Control", "Collects fork outputs.", 8, 1)
        });
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkflowSummary>>> GetWorkflows(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, Name, EngineVersion, IsActive, UpdatedAt, CreatedAt
            FROM Workflows
            WHERE TenantId = @tenantId
            ORDER BY UpdatedAt DESC, CreatedAt DESC
            """,
            static reader => new WorkflowSummary(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetInt32(2),
                reader.GetBoolean(3),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                reader.GetDateTime(5)),
            cancellationToken,
            ("@tenantId", tenantId));

        return Ok(rows);
    }

    [HttpPost]
    public async Task<ActionResult<WorkflowDetail>> SaveWorkflow(SaveWorkflowRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Workflow name is required." });
        }

        var validation = WorkflowV3Validator.Validate(request.Definition);
        if (validation.Count > 0)
        {
            return BadRequest(new { errors = validation });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var definitionJson = JsonSerializer.Serialize(request.Definition);
        var row = await InventorySql.QuerySingleAsync(
            _db,
            """
            INSERT INTO Workflows (TenantId, Name, EngineVersion, DefinitionJson, IsActive, CreatedAt, UpdatedAt)
            OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.EngineVersion, INSERTED.DefinitionJson, INSERTED.IsActive, INSERTED.UpdatedAt, INSERTED.CreatedAt
            VALUES (@tenantId, @name, 3, @definitionJson, @isActive, SYSUTCDATETIME(), SYSUTCDATETIME())
            """,
            static reader => new WorkflowDetail(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetInt32(2),
                JsonDocument.Parse(reader.GetString(3)).RootElement.Clone(),
                reader.GetBoolean(4),
                reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                reader.GetDateTime(6)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@name", request.Name.Trim()),
            ("@definitionJson", definitionJson),
            ("@isActive", request.IsActive));

        return CreatedAtAction(nameof(GetWorkflows), new { id = row.Id }, row);
    }

    [HttpPost("{id:int}/runs")]
    public async Task<ActionResult<WorkflowRunResponse>> StartRun(int id, StartWorkflowRunRequest request, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var definition = await InventorySql.QueryAsync(
            _db,
            "SELECT DefinitionJson FROM Workflows WHERE Id = @id AND TenantId = @tenantId AND EngineVersion = 3",
            static reader => reader.GetString(0),
            cancellationToken,
            ("@id", id),
            ("@tenantId", tenantId));

        if (definition.Count == 0)
        {
            return NotFound();
        }

        var plan = WorkflowV3Executor.Plan(JsonDocument.Parse(definition[0]).RootElement);
        var inputJson = JsonSerializer.Serialize(request.Input ?? new Dictionary<string, object?>());
        var planJson = JsonSerializer.Serialize(plan);
        var run = await InventorySql.QuerySingleAsync(
            _db,
            """
            INSERT INTO WorkflowRuns (TenantId, WorkflowId, EngineVersion, Status, InputJson, ExecutionPlanJson, StartedAt)
            OUTPUT INSERTED.Id, INSERTED.WorkflowId, INSERTED.EngineVersion, INSERTED.Status, INSERTED.ExecutionPlanJson, INSERTED.StartedAt
            VALUES (@tenantId, @workflowId, 3, N'Queued', @inputJson, @planJson, SYSUTCDATETIME())
            """,
            static reader => new WorkflowRunResponse(
                reader.GetInt32(0),
                reader.GetInt32(1),
                reader.GetInt32(2),
                reader.GetString(3),
                JsonDocument.Parse(reader.GetString(4)).RootElement.Clone(),
                reader.GetDateTime(5)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@workflowId", id),
            ("@inputJson", inputJson),
            ("@planJson", planJson));

        return Accepted(run);
    }
}

internal static class WorkflowV3Validator
{
    public static List<string> Validate(JsonElement definition)
    {
        var errors = new List<string>();
        if (definition.ValueKind != JsonValueKind.Object)
        {
            errors.Add("Workflow definition must be an object.");
            return errors;
        }

        if (!definition.TryGetProperty("nodes", out var nodes) || nodes.ValueKind != JsonValueKind.Array)
        {
            errors.Add("Workflow definition needs a nodes array.");
            return errors;
        }

        foreach (var node in nodes.EnumerateArray())
        {
            var type = node.TryGetProperty("type", out var typeElement) ? typeElement.GetString() : null;
            if (string.Equals(type, "Fork", StringComparison.OrdinalIgnoreCase) &&
                (!node.TryGetProperty("branches", out var branches) || branches.ValueKind != JsonValueKind.Array || branches.GetArrayLength() < 2))
            {
                errors.Add("Fork nodes need at least two branches.");
            }

            if (string.Equals(type, "Loop", StringComparison.OrdinalIgnoreCase) &&
                !node.TryGetProperty("iterator", out _) &&
                !node.TryGetProperty("condition", out _))
            {
                errors.Add("Loop nodes need an iterator or condition.");
            }
        }

        return errors;
    }
}

internal static class WorkflowV3Executor
{
    public static List<object> Plan(JsonElement definition)
    {
        var plan = new List<object>();
        if (!definition.TryGetProperty("nodes", out var nodes) || nodes.ValueKind != JsonValueKind.Array)
        {
            return plan;
        }

        foreach (var node in nodes.EnumerateArray())
        {
            var id = node.TryGetProperty("id", out var idElement) ? idElement.GetString() : Guid.NewGuid().ToString("N");
            var type = node.TryGetProperty("type", out var typeElement) ? typeElement.GetString() ?? "Task" : "Task";
            plan.Add(type switch
            {
                "Fork" => new { id, type, mode = "parallel", branchCount = node.TryGetProperty("branches", out var branches) && branches.ValueKind == JsonValueKind.Array ? branches.GetArrayLength() : 0 },
                "Loop" => new { id, type, mode = "loop", maxIterations = node.TryGetProperty("maxIterations", out var max) && max.TryGetInt32(out var maxIterations) ? maxIterations : 100 },
                _ => new { id, type, mode = "single" }
            });
        }

        return plan;
    }
}

public record WorkflowNodeDefinition(string Type, string Group, string Description, int MinInputs, int MaxOutputs);
public record WorkflowSummary(int Id, string Name, int EngineVersion, bool IsActive, DateTime? UpdatedAt, DateTime CreatedAt);
public record WorkflowDetail(int Id, string Name, int EngineVersion, JsonElement Definition, bool IsActive, DateTime? UpdatedAt, DateTime CreatedAt);
public record WorkflowRunResponse(int Id, int WorkflowId, int EngineVersion, string Status, JsonElement ExecutionPlan, DateTime StartedAt);
public record SaveWorkflowRequest(string Name, JsonElement Definition, bool IsActive);
public record StartWorkflowRunRequest(Dictionary<string, object?>? Input);
