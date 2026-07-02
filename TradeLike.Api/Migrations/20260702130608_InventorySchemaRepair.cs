using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class InventorySchemaRepair : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'CompanyBranches', N'U') IS NULL
                BEGIN
                    CREATE TABLE CompanyBranches (
                        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompanyBranches PRIMARY KEY,
                        TenantId int NOT NULL,
                        Name nvarchar(160) NOT NULL,
                        IsDefault bit NOT NULL CONSTRAINT DF_CompanyBranches_IsDefault DEFAULT 0,
                        IsActive bit NOT NULL CONSTRAINT DF_CompanyBranches_IsActive DEFAULT 1,
                        CreatedAt datetime2 NOT NULL CONSTRAINT DF_CompanyBranches_CreatedAt DEFAULT SYSUTCDATETIME()
                    );
                END;

                IF OBJECT_ID(N'Products', N'U') IS NULL
                BEGIN
                    CREATE TABLE Products (
                        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Products PRIMARY KEY,
                        TenantId int NOT NULL,
                        BranchId int NULL,
                        Sku nvarchar(80) NOT NULL,
                        Name nvarchar(180) NOT NULL,
                        Description nvarchar(1000) NULL,
                        Unit nvarchar(40) NOT NULL CONSTRAINT DF_Products_Unit DEFAULT N'each',
                        ReorderLevel decimal(18,2) NOT NULL CONSTRAINT DF_Products_ReorderLevel DEFAULT 0,
                        OnHand decimal(18,2) NOT NULL CONSTRAINT DF_Products_OnHand DEFAULT 0,
                        IsActive bit NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT 1,
                        CreatedAt datetime2 NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT SYSUTCDATETIME()
                    );
                END
                ELSE
                BEGIN
                    IF COL_LENGTH(N'Products', N'BranchId') IS NULL ALTER TABLE Products ADD BranchId int NULL;
                    IF COL_LENGTH(N'Products', N'Description') IS NULL ALTER TABLE Products ADD Description nvarchar(1000) NULL;
                    IF COL_LENGTH(N'Products', N'Unit') IS NULL ALTER TABLE Products ADD Unit nvarchar(40) NOT NULL CONSTRAINT DF_Products_Unit DEFAULT N'each';
                    IF COL_LENGTH(N'Products', N'ReorderLevel') IS NULL ALTER TABLE Products ADD ReorderLevel decimal(18,2) NOT NULL CONSTRAINT DF_Products_ReorderLevel DEFAULT 0;
                    IF COL_LENGTH(N'Products', N'OnHand') IS NULL ALTER TABLE Products ADD OnHand decimal(18,2) NOT NULL CONSTRAINT DF_Products_OnHand DEFAULT 0;
                    IF COL_LENGTH(N'Products', N'IsActive') IS NULL ALTER TABLE Products ADD IsActive bit NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT 1;
                    IF COL_LENGTH(N'Products', N'CreatedAt') IS NULL ALTER TABLE Products ADD CreatedAt datetime2 NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT SYSUTCDATETIME();
                END;

                IF OBJECT_ID(N'Suppliers', N'U') IS NULL
                BEGIN
                    CREATE TABLE Suppliers (
                        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Suppliers PRIMARY KEY,
                        TenantId int NOT NULL,
                        BranchId int NULL,
                        Name nvarchar(180) NOT NULL,
                        Email nvarchar(255) NULL,
                        Phone nvarchar(60) NULL,
                        LeadTimeDays int NOT NULL CONSTRAINT DF_Suppliers_LeadTimeDays DEFAULT 3,
                        CreatedAt datetime2 NOT NULL CONSTRAINT DF_Suppliers_CreatedAt DEFAULT SYSUTCDATETIME()
                    );
                END;

                IF OBJECT_ID(N'PurchaseOrders', N'U') IS NULL
                BEGIN
                    CREATE TABLE PurchaseOrders (
                        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_PurchaseOrders PRIMARY KEY,
                        TenantId int NOT NULL,
                        BranchId int NULL,
                        SupplierId int NOT NULL,
                        Status nvarchar(40) NOT NULL CONSTRAINT DF_PurchaseOrders_Status DEFAULT N'Draft',
                        ExpectedAt datetime2 NULL,
                        ReceivedAt datetime2 NULL,
                        CreatedAt datetime2 NOT NULL CONSTRAINT DF_PurchaseOrders_CreatedAt DEFAULT SYSUTCDATETIME()
                    );
                END;

                IF OBJECT_ID(N'PurchaseOrderLines', N'U') IS NULL
                BEGIN
                    CREATE TABLE PurchaseOrderLines (
                        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_PurchaseOrderLines PRIMARY KEY,
                        PurchaseOrderId int NOT NULL,
                        ProductId int NOT NULL,
                        Quantity decimal(18,2) NOT NULL,
                        UnitCost decimal(18,2) NOT NULL
                    );
                END;

                IF OBJECT_ID(N'StockMovements', N'U') IS NULL
                BEGIN
                    CREATE TABLE StockMovements (
                        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_StockMovements PRIMARY KEY,
                        TenantId int NOT NULL,
                        BranchId int NULL,
                        ProductId int NOT NULL,
                        QuantityChange decimal(18,2) NOT NULL,
                        Reason nvarchar(120) NOT NULL,
                        Reference nvarchar(120) NULL,
                        CreatedAt datetime2 NOT NULL CONSTRAINT DF_StockMovements_CreatedAt DEFAULT SYSUTCDATETIME()
                    );
                END;

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CompanyBranches_TenantId_Name' AND object_id = OBJECT_ID(N'CompanyBranches'))
                    CREATE UNIQUE INDEX IX_CompanyBranches_TenantId_Name ON CompanyBranches (TenantId, Name);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Products_TenantId_Sku' AND object_id = OBJECT_ID(N'Products'))
                    CREATE UNIQUE INDEX IX_Products_TenantId_Sku ON Products (TenantId, Sku);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Products_BranchId' AND object_id = OBJECT_ID(N'Products'))
                    CREATE INDEX IX_Products_BranchId ON Products (BranchId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Suppliers_TenantId_Name' AND object_id = OBJECT_ID(N'Suppliers'))
                    CREATE INDEX IX_Suppliers_TenantId_Name ON Suppliers (TenantId, Name);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Suppliers_BranchId' AND object_id = OBJECT_ID(N'Suppliers'))
                    CREATE INDEX IX_Suppliers_BranchId ON Suppliers (BranchId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PurchaseOrders_TenantId_Status' AND object_id = OBJECT_ID(N'PurchaseOrders'))
                    CREATE INDEX IX_PurchaseOrders_TenantId_Status ON PurchaseOrders (TenantId, Status);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PurchaseOrders_SupplierId' AND object_id = OBJECT_ID(N'PurchaseOrders'))
                    CREATE INDEX IX_PurchaseOrders_SupplierId ON PurchaseOrders (SupplierId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PurchaseOrders_BranchId' AND object_id = OBJECT_ID(N'PurchaseOrders'))
                    CREATE INDEX IX_PurchaseOrders_BranchId ON PurchaseOrders (BranchId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PurchaseOrderLines_PurchaseOrderId' AND object_id = OBJECT_ID(N'PurchaseOrderLines'))
                    CREATE INDEX IX_PurchaseOrderLines_PurchaseOrderId ON PurchaseOrderLines (PurchaseOrderId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PurchaseOrderLines_ProductId' AND object_id = OBJECT_ID(N'PurchaseOrderLines'))
                    CREATE INDEX IX_PurchaseOrderLines_ProductId ON PurchaseOrderLines (ProductId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StockMovements_TenantId_CreatedAt' AND object_id = OBJECT_ID(N'StockMovements'))
                    CREATE INDEX IX_StockMovements_TenantId_CreatedAt ON StockMovements (TenantId, CreatedAt);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StockMovements_ProductId' AND object_id = OBJECT_ID(N'StockMovements'))
                    CREATE INDEX IX_StockMovements_ProductId ON StockMovements (ProductId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StockMovements_BranchId' AND object_id = OBJECT_ID(N'StockMovements'))
                    CREATE INDEX IX_StockMovements_BranchId ON StockMovements (BranchId);
                """);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This migration is intentionally repair-only and idempotent. It may add
            // columns to existing production tables, so rollback is left as a no-op
            // to avoid deleting live inventory data.
        }
    }
}
