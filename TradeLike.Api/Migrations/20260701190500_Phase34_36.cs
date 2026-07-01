using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    public partial class Phase34_36 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[DocumentTemplates]', N'U') IS NULL
                CREATE TABLE [DocumentTemplates] (
                    [Id] int NOT NULL IDENTITY,
                    [TenantId] int NOT NULL,
                    [Type] nvarchar(30) NOT NULL,
                    [Name] nvarchar(160) NOT NULL,
                    [HtmlTemplate] nvarchar(max) NOT NULL,
                    [CreatedById] int NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    CONSTRAINT [PK_DocumentTemplates] PRIMARY KEY ([Id])
                );
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DocumentTemplates_TenantId_Type')
                CREATE INDEX [IX_DocumentTemplates_TenantId_Type] ON [DocumentTemplates] ([TenantId], [Type]);
                """);

            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[GeneratedDocuments]', N'U') IS NULL
                CREATE TABLE [GeneratedDocuments] (
                    [Id] int NOT NULL IDENTITY,
                    [TenantId] int NOT NULL,
                    [EntityType] nvarchar(30) NOT NULL,
                    [EntityId] int NOT NULL,
                    [PdfUrl] nvarchar(1000) NOT NULL,
                    [GeneratedAtUtc] datetime2 NOT NULL,
                    [GeneratedById] int NOT NULL,
                    CONSTRAINT [PK_GeneratedDocuments] PRIMARY KEY ([Id])
                );
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_GeneratedDocuments_TenantId_EntityType_EntityId')
                CREATE INDEX [IX_GeneratedDocuments_TenantId_EntityType_EntityId] ON [GeneratedDocuments] ([TenantId], [EntityType], [EntityId]);
                """);

            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[AccountingTokens]', N'U') IS NULL
                CREATE TABLE [AccountingTokens] (
                    [Id] int NOT NULL IDENTITY,
                    [TenantId] int NOT NULL,
                    [Provider] nvarchar(30) NOT NULL,
                    [AccessToken] nvarchar(max) NOT NULL,
                    [RefreshToken] nvarchar(max) NOT NULL,
                    [ExpiresUtc] datetime2 NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    CONSTRAINT [PK_AccountingTokens] PRIMARY KEY ([Id])
                );
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AccountingTokens_TenantId_Provider')
                CREATE UNIQUE INDEX [IX_AccountingTokens_TenantId_Provider] ON [AccountingTokens] ([TenantId], [Provider]);
                """);

            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[AccountingSyncLogs]', N'U') IS NULL
                CREATE TABLE [AccountingSyncLogs] (
                    [Id] int NOT NULL IDENTITY,
                    [TenantId] int NOT NULL,
                    [Provider] nvarchar(30) NOT NULL,
                    [Direction] nvarchar(40) NOT NULL,
                    [Status] nvarchar(40) NOT NULL,
                    [DetailsJson] nvarchar(max) NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    CONSTRAINT [PK_AccountingSyncLogs] PRIMARY KEY ([Id])
                );
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AccountingSyncLogs_TenantId_Provider_CreatedAtUtc')
                CREATE INDEX [IX_AccountingSyncLogs_TenantId_Provider_CreatedAtUtc] ON [AccountingSyncLogs] ([TenantId], [Provider], [CreatedAtUtc]);
                """);

            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[FullDataExportLogs]', N'U') IS NULL
                CREATE TABLE [FullDataExportLogs] (
                    [Id] int NOT NULL IDENTITY,
                    [TenantId] int NOT NULL,
                    [RequestedById] int NOT NULL,
                    [PlanName] nvarchar(20) NOT NULL,
                    [CreatedAtUtc] datetime2 NOT NULL,
                    CONSTRAINT [PK_FullDataExportLogs] PRIMARY KEY ([Id])
                );
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FullDataExportLogs_TenantId_CreatedAtUtc')
                CREATE INDEX [IX_FullDataExportLogs_TenantId_CreatedAtUtc] ON [FullDataExportLogs] ([TenantId], [CreatedAtUtc]);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "GeneratedDocuments");
            migrationBuilder.DropTable(name: "DocumentTemplates");
            migrationBuilder.DropTable(name: "AccountingSyncLogs");
            migrationBuilder.DropTable(name: "AccountingTokens");
            migrationBuilder.DropTable(name: "FullDataExportLogs");
        }
    }
}
