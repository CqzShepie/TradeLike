using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;
using TradeLike.Api.Security;

namespace TradeLike.Api.Inventory;

[ApiController]
[Route("api/inventory")]
[Authorize(Policy = "RequireManagerRole")]
[PlanGuard(Feature.Inventory)]
public class InventoryController : ControllerBase
{
    private readonly TradeLikeDbContext _db;

    public InventoryController(TradeLikeDbContext db)
    {
        _db = db;
    }

    [HttpGet("products")]
    public async Task<ActionResult<IReadOnlyList<ProductResponse>>> GetProducts(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = CompanyBranchContext.GetBranchId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, BranchId, Sku, Name, Description, Unit, ReorderLevel, OnHand, IsActive, CreatedAt
            FROM Products
            WHERE TenantId = @tenantId AND (@branchId IS NULL OR BranchId IS NULL OR BranchId = @branchId)
            ORDER BY Name
            """,
            static reader => new ProductResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetString(5),
                reader.GetDecimal(6),
                reader.GetDecimal(7),
                reader.GetBoolean(8),
                reader.GetDateTime(9)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@branchId", branchId));

        return Ok(rows);
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductResponse>> CreateProduct(CreateProductRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Sku))
        {
            return BadRequest(new { error = "Product name and SKU are required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = request.BranchId ?? CompanyBranchContext.GetBranchId(HttpContext);
        var product = await InventorySql.QuerySingleAsync(
            _db,
            """
            INSERT INTO Products (TenantId, BranchId, Sku, Name, Description, Unit, ReorderLevel, OnHand, IsActive, CreatedAt)
            OUTPUT INSERTED.Id, INSERTED.BranchId, INSERTED.Sku, INSERTED.Name, INSERTED.Description, INSERTED.Unit,
                   INSERTED.ReorderLevel, INSERTED.OnHand, INSERTED.IsActive, INSERTED.CreatedAt
            VALUES (@tenantId, @branchId, @sku, @name, @description, @unit, @reorderLevel, @onHand, 1, SYSUTCDATETIME())
            """,
            static reader => new ProductResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetString(5),
                reader.GetDecimal(6),
                reader.GetDecimal(7),
                reader.GetBoolean(8),
                reader.GetDateTime(9)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@branchId", branchId),
            ("@sku", request.Sku.Trim()),
            ("@name", request.Name.Trim()),
            ("@description", DbValue(request.Description)),
            ("@unit", string.IsNullOrWhiteSpace(request.Unit) ? "each" : request.Unit.Trim()),
            ("@reorderLevel", request.ReorderLevel),
            ("@onHand", request.OpeningStock));

        return CreatedAtAction(nameof(GetProducts), new { id = product.Id }, product);
    }

    [HttpGet("suppliers")]
    public async Task<ActionResult<IReadOnlyList<SupplierResponse>>> GetSuppliers(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = CompanyBranchContext.GetBranchId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, BranchId, Name, Email, Phone, LeadTimeDays, CreatedAt
            FROM Suppliers
            WHERE TenantId = @tenantId AND (@branchId IS NULL OR BranchId IS NULL OR BranchId = @branchId)
            ORDER BY Name
            """,
            static reader => new SupplierResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetInt32(5),
                reader.GetDateTime(6)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@branchId", branchId));

        return Ok(rows);
    }

    [HttpPost("suppliers")]
    public async Task<ActionResult<SupplierResponse>> CreateSupplier(CreateSupplierRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Supplier name is required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = request.BranchId ?? CompanyBranchContext.GetBranchId(HttpContext);
        var supplier = await InventorySql.QuerySingleAsync(
            _db,
            """
            INSERT INTO Suppliers (TenantId, BranchId, Name, Email, Phone, LeadTimeDays, CreatedAt)
            OUTPUT INSERTED.Id, INSERTED.BranchId, INSERTED.Name, INSERTED.Email, INSERTED.Phone, INSERTED.LeadTimeDays, INSERTED.CreatedAt
            VALUES (@tenantId, @branchId, @name, @email, @phone, @leadTimeDays, SYSUTCDATETIME())
            """,
            static reader => new SupplierResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetInt32(5),
                reader.GetDateTime(6)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@branchId", branchId),
            ("@name", request.Name.Trim()),
            ("@email", DbValue(request.Email)),
            ("@phone", DbValue(request.Phone)),
            ("@leadTimeDays", request.LeadTimeDays));

        return CreatedAtAction(nameof(GetSuppliers), new { id = supplier.Id }, supplier);
    }

    [HttpGet("stock-movements")]
    public async Task<ActionResult<IReadOnlyList<StockMovementResponse>>> GetStockMovements(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = CompanyBranchContext.GetBranchId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT TOP (200) m.Id, m.BranchId, m.ProductId, p.Name, m.QuantityChange, m.Reason, m.Reference, m.CreatedAt
            FROM StockMovements m
            INNER JOIN Products p ON p.Id = m.ProductId AND p.TenantId = m.TenantId
            WHERE m.TenantId = @tenantId AND (@branchId IS NULL OR m.BranchId IS NULL OR m.BranchId = @branchId)
            ORDER BY m.CreatedAt DESC, m.Id DESC
            """,
            static reader => new StockMovementResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetInt32(2),
                reader.GetString(3),
                reader.GetDecimal(4),
                reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetDateTime(7)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@branchId", branchId));

        return Ok(rows);
    }

    [HttpPost("stock-movements")]
    public async Task<ActionResult<StockMovementResponse>> CreateStockMovement(CreateStockMovementRequest request, CancellationToken cancellationToken)
    {
        if (request.ProductId <= 0 || request.QuantityChange == 0)
        {
            return BadRequest(new { error = "Product and non-zero quantity change are required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = request.BranchId ?? CompanyBranchContext.GetBranchId(HttpContext);
        var movement = await InsertMovementAsync(
            tenantId,
            branchId,
            request.ProductId,
            request.QuantityChange,
            string.IsNullOrWhiteSpace(request.Reason) ? "Adjustment" : request.Reason.Trim(),
            request.Reference,
            cancellationToken);

        if (movement is null)
        {
            return NotFound(new { error = "Product was not found for this company." });
        }

        return CreatedAtAction(nameof(GetStockMovements), new { id = movement.Id }, movement);
    }

    [HttpGet("purchase-orders")]
    public async Task<ActionResult<IReadOnlyList<PurchaseOrderResponse>>> GetPurchaseOrders(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = CompanyBranchContext.GetBranchId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT po.Id, po.BranchId, po.SupplierId, s.Name, po.Status, po.ExpectedAt, po.CreatedAt,
                   COALESCE(SUM(pol.Quantity * pol.UnitCost), 0) AS Total
            FROM PurchaseOrders po
            LEFT JOIN Suppliers s ON s.Id = po.SupplierId AND s.TenantId = po.TenantId
            LEFT JOIN PurchaseOrderLines pol ON pol.PurchaseOrderId = po.Id
            WHERE po.TenantId = @tenantId AND (@branchId IS NULL OR po.BranchId IS NULL OR po.BranchId = @branchId)
            GROUP BY po.Id, po.BranchId, po.SupplierId, s.Name, po.Status, po.ExpectedAt, po.CreatedAt
            ORDER BY po.CreatedAt DESC
            """,
            static reader => new PurchaseOrderResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetInt32(2),
                reader.IsDBNull(3) ? "Unassigned" : reader.GetString(3),
                reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                reader.GetDateTime(6),
                reader.GetDecimal(7)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@branchId", branchId));

        return Ok(rows);
    }

    [HttpPost("purchase-orders")]
    public async Task<ActionResult<PurchaseOrderResponse>> CreatePurchaseOrder(CreatePurchaseOrderRequest request, CancellationToken cancellationToken)
    {
        if (request.SupplierId <= 0 || request.Lines.Count == 0)
        {
            return BadRequest(new { error = "Supplier and at least one line are required." });
        }

        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = request.BranchId ?? CompanyBranchContext.GetBranchId(HttpContext);
        var connection = _db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            var poId = Convert.ToInt32(await InventorySql.ExecuteScalarAsync(
                connection,
                transaction,
                """
                INSERT INTO PurchaseOrders (TenantId, BranchId, SupplierId, Status, ExpectedAt, CreatedAt)
                OUTPUT INSERTED.Id
                VALUES (@tenantId, @branchId, @supplierId, N'Draft', @expectedAt, SYSUTCDATETIME())
                """,
                cancellationToken,
                ("@tenantId", tenantId),
                ("@branchId", branchId),
                ("@supplierId", request.SupplierId),
                ("@expectedAt", request.ExpectedAt)));

            foreach (var line in request.Lines)
            {
                if (line.ProductId <= 0 || line.Quantity <= 0)
                {
                    return BadRequest(new { error = "Purchase order lines need a product and positive quantity." });
                }

                await InventorySql.ExecuteNonQueryAsync(
                    connection,
                    transaction,
                    """
                    INSERT INTO PurchaseOrderLines (PurchaseOrderId, ProductId, Quantity, UnitCost)
                    VALUES (@purchaseOrderId, @productId, @quantity, @unitCost)
                    """,
                    cancellationToken,
                    ("@purchaseOrderId", poId),
                    ("@productId", line.ProductId),
                    ("@quantity", line.Quantity),
                    ("@unitCost", line.UnitCost));
            }

            await transaction.CommitAsync(cancellationToken);
            var created = await GetPurchaseOrderByIdAsync(tenantId, poId, cancellationToken);
            return CreatedAtAction(nameof(GetPurchaseOrders), new { id = poId }, created);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    [HttpPost("purchase-orders/{id:int}/receive")]
    public async Task<ActionResult<object>> ReceivePurchaseOrder(int id, CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var branchId = CompanyBranchContext.GetBranchId(HttpContext);
        var lines = await InventorySql.QueryAsync(
            _db,
            """
            SELECT pol.ProductId, pol.Quantity
            FROM PurchaseOrderLines pol
            INNER JOIN PurchaseOrders po ON po.Id = pol.PurchaseOrderId
            WHERE po.Id = @id AND po.TenantId = @tenantId
            """,
            static reader => (ProductId: reader.GetInt32(0), Quantity: reader.GetDecimal(1)),
            cancellationToken,
            ("@id", id),
            ("@tenantId", tenantId));

        if (lines.Count == 0)
        {
            return NotFound();
        }

        foreach (var line in lines)
        {
            await InsertMovementAsync(tenantId, branchId, line.ProductId, line.Quantity, "PO received", $"PO-{id}", cancellationToken);
        }

        await InventorySql.ExecuteNonQueryAsync(
            _db,
            "UPDATE PurchaseOrders SET Status = N'Received', ReceivedAt = SYSUTCDATETIME() WHERE Id = @id AND TenantId = @tenantId",
            cancellationToken,
            ("@id", id),
            ("@tenantId", tenantId));

        return Ok(new { id, status = "Received", receivedLines = lines.Count });
    }

    [HttpGet("low-stock")]
    public async Task<ActionResult<IReadOnlyList<ProductResponse>>> GetLowStock(CancellationToken cancellationToken)
    {
        var tenantId = TenantHelpers.GetTenantId(HttpContext);
        var rows = await InventorySql.QueryAsync(
            _db,
            """
            SELECT Id, BranchId, Sku, Name, Description, Unit, ReorderLevel, OnHand, IsActive, CreatedAt
            FROM Products
            WHERE TenantId = @tenantId AND IsActive = 1 AND OnHand <= ReorderLevel
            ORDER BY OnHand ASC, Name
            """,
            static reader => new ProductResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetString(5),
                reader.GetDecimal(6),
                reader.GetDecimal(7),
                reader.GetBoolean(8),
                reader.GetDateTime(9)),
            cancellationToken,
            ("@tenantId", tenantId));

        return Ok(rows);
    }

    private async Task<StockMovementResponse?> InsertMovementAsync(
        int tenantId,
        int? branchId,
        int productId,
        decimal quantityChange,
        string reason,
        string? reference,
        CancellationToken cancellationToken)
    {
        var productName = await InventorySql.ExecuteScalarAsync(
            _db,
            "SELECT Name FROM Products WHERE Id = @productId AND TenantId = @tenantId",
            cancellationToken,
            ("@productId", productId),
            ("@tenantId", tenantId));

        if (productName is null || productName == DBNull.Value)
        {
            return null;
        }

        await InventorySql.ExecuteNonQueryAsync(
            _db,
            "UPDATE Products SET OnHand = OnHand + @quantityChange WHERE Id = @productId AND TenantId = @tenantId",
            cancellationToken,
            ("@quantityChange", quantityChange),
            ("@productId", productId),
            ("@tenantId", tenantId));

        return await InventorySql.QuerySingleAsync(
            _db,
            """
            INSERT INTO StockMovements (TenantId, BranchId, ProductId, QuantityChange, Reason, Reference, CreatedAt)
            OUTPUT INSERTED.Id, INSERTED.BranchId, INSERTED.ProductId, @productName, INSERTED.QuantityChange,
                   INSERTED.Reason, INSERTED.Reference, INSERTED.CreatedAt
            VALUES (@tenantId, @branchId, @productId, @quantityChange, @reason, @reference, SYSUTCDATETIME())
            """,
            static reader => new StockMovementResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetInt32(2),
                reader.GetString(3),
                reader.GetDecimal(4),
                reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetDateTime(7)),
            cancellationToken,
            ("@tenantId", tenantId),
            ("@branchId", branchId),
            ("@productId", productId),
            ("@productName", productName),
            ("@quantityChange", quantityChange),
            ("@reason", reason),
            ("@reference", DbValue(reference)));
    }

    private async Task<PurchaseOrderResponse> GetPurchaseOrderByIdAsync(int tenantId, int id, CancellationToken cancellationToken)
    {
        return await InventorySql.QuerySingleAsync(
            _db,
            """
            SELECT po.Id, po.BranchId, po.SupplierId, s.Name, po.Status, po.ExpectedAt, po.CreatedAt,
                   COALESCE(SUM(pol.Quantity * pol.UnitCost), 0) AS Total
            FROM PurchaseOrders po
            LEFT JOIN Suppliers s ON s.Id = po.SupplierId AND s.TenantId = po.TenantId
            LEFT JOIN PurchaseOrderLines pol ON pol.PurchaseOrderId = po.Id
            WHERE po.Id = @id AND po.TenantId = @tenantId
            GROUP BY po.Id, po.BranchId, po.SupplierId, s.Name, po.Status, po.ExpectedAt, po.CreatedAt
            """,
            static reader => new PurchaseOrderResponse(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetInt32(2),
                reader.IsDBNull(3) ? "Unassigned" : reader.GetString(3),
                reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                reader.GetDateTime(6),
                reader.GetDecimal(7)),
            cancellationToken,
            ("@id", id),
            ("@tenantId", tenantId));
    }

    private static object DbValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? DBNull.Value : value.Trim();
    }
}

public class LowStockAlertJob
{
    private readonly TradeLikeDbContext _db;

    public LowStockAlertJob(TradeLikeDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<LowStockAlert>> RunAsync(CancellationToken cancellationToken = default)
    {
        return await InventorySql.QueryAsync(
            _db,
            """
            SELECT TenantId, BranchId, Id, Sku, Name, OnHand, ReorderLevel
            FROM Products
            WHERE IsActive = 1 AND OnHand <= ReorderLevel
            ORDER BY TenantId, BranchId, Name
            """,
            static reader => new LowStockAlert(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetInt32(1),
                reader.GetInt32(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetDecimal(5),
                reader.GetDecimal(6)),
            cancellationToken);
    }
}

public static class CompanyBranchContext
{
    public static int? GetBranchId(HttpContext context)
    {
        var raw = context.Request.Headers["X-Company-Branch-Id"].FirstOrDefault();
        return int.TryParse(raw, out var branchId) && branchId > 0 ? branchId : null;
    }
}

internal static class InventorySql
{
    public static async Task<List<T>> QueryAsync<T>(
        TradeLikeDbContext db,
        string sql,
        Func<IDataReader, T> map,
        CancellationToken cancellationToken,
        params (string Name, object? Value)[] parameters)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        AddParameters(command, parameters);
        var rows = new List<T>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(map(reader));
        }

        return rows;
    }

    public static async Task<T> QuerySingleAsync<T>(
        TradeLikeDbContext db,
        string sql,
        Func<IDataReader, T> map,
        CancellationToken cancellationToken,
        params (string Name, object? Value)[] parameters)
    {
        var rows = await QueryAsync(db, sql, map, cancellationToken, parameters);
        return rows.Single();
    }

    public static async Task<object?> ExecuteScalarAsync(
        TradeLikeDbContext db,
        string sql,
        CancellationToken cancellationToken,
        params (string Name, object? Value)[] parameters)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        return await ExecuteScalarAsync(connection, null, sql, cancellationToken, parameters);
    }

    public static async Task<object?> ExecuteScalarAsync(
        IDbConnection connection,
        IDbTransaction? transaction,
        string sql,
        CancellationToken cancellationToken,
        params (string Name, object? Value)[] parameters)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        AddParameters(command, parameters);
        return await Task.Run(command.ExecuteScalar, cancellationToken);
    }

    public static async Task<int> ExecuteNonQueryAsync(
        TradeLikeDbContext db,
        string sql,
        CancellationToken cancellationToken,
        params (string Name, object? Value)[] parameters)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        return await ExecuteNonQueryAsync(connection, null, sql, cancellationToken, parameters);
    }

    public static async Task<int> ExecuteNonQueryAsync(
        IDbConnection connection,
        IDbTransaction? transaction,
        string sql,
        CancellationToken cancellationToken,
        params (string Name, object? Value)[] parameters)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        AddParameters(command, parameters);
        return await Task.Run(command.ExecuteNonQuery, cancellationToken);
    }

    private static void AddParameters(IDbCommand command, IEnumerable<(string Name, object? Value)> parameters)
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

public record ProductResponse(int Id, int? BranchId, string Sku, string Name, string? Description, string Unit, decimal ReorderLevel, decimal OnHand, bool IsActive, DateTime CreatedAt);
public record SupplierResponse(int Id, int? BranchId, string Name, string? Email, string? Phone, int LeadTimeDays, DateTime CreatedAt);
public record StockMovementResponse(int Id, int? BranchId, int ProductId, string ProductName, decimal QuantityChange, string Reason, string? Reference, DateTime CreatedAt);
public record PurchaseOrderResponse(int Id, int? BranchId, int SupplierId, string SupplierName, string Status, DateTime? ExpectedAt, DateTime CreatedAt, decimal Total);
public record LowStockAlert(int TenantId, int? BranchId, int ProductId, string Sku, string Name, decimal OnHand, decimal ReorderLevel);
public record CreateProductRequest(string Sku, string Name, string? Description, string? Unit, decimal ReorderLevel, decimal OpeningStock, int? BranchId);
public record CreateSupplierRequest(string Name, string? Email, string? Phone, int LeadTimeDays, int? BranchId);
public record CreateStockMovementRequest(int ProductId, decimal QuantityChange, string? Reason, string? Reference, int? BranchId);
public record CreatePurchaseOrderRequest(int SupplierId, DateTime? ExpectedAt, int? BranchId, List<CreatePurchaseOrderLineRequest> Lines);
public record CreatePurchaseOrderLineRequest(int ProductId, decimal Quantity, decimal UnitCost);
