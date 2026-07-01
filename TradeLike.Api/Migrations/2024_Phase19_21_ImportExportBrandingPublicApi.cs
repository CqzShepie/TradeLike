using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TradeLike.Api.Data;

#nullable disable

namespace TradeLike.Api.Migrations;

[DbContext(typeof(TradeLikeDbContext))]
[Migration("20260701190000_Phase19_21")]
public partial class Phase19_21 : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF OBJECT_ID(N'[dbo].[ApiClients]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ApiClients] (
                    [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_ApiClients] PRIMARY KEY,
                    [TenantId] int NOT NULL,
                    [ClientId] nvarchar(64) NOT NULL,
                    [ClientSecretHash] nvarchar(255) NOT NULL,
                    [Name] nvarchar(160) NOT NULL,
                    [Scopes] nvarchar(500) NOT NULL,
                    [IsActive] bit NOT NULL CONSTRAINT [DF_ApiClients_IsActive] DEFAULT 1,
                    [CreatedAtUtc] datetime2 NOT NULL CONSTRAINT [DF_ApiClients_CreatedAtUtc] DEFAULT SYSUTCDATETIME(),
                    [LastUsedAtUtc] datetime2 NULL
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_ApiClients_ClientId' AND object_id = OBJECT_ID(N'[dbo].[ApiClients]'))
                CREATE UNIQUE INDEX [UX_ApiClients_ClientId] ON [dbo].[ApiClients] ([ClientId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ApiClients_TenantId' AND object_id = OBJECT_ID(N'[dbo].[ApiClients]'))
                CREATE INDEX [IX_ApiClients_TenantId] ON [dbo].[ApiClients] ([TenantId]);
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID(N'[dbo].[TenantBranding]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[TenantBranding] (
                    [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_TenantBranding] PRIMARY KEY,
                    [TenantId] int NOT NULL,
                    [BrandName] nvarchar(180) NOT NULL,
                    [LogoUrl] nvarchar(2048) NULL,
                    [PrimaryColor] nvarchar(16) NOT NULL,
                    [AccentColor] nvarchar(16) NOT NULL,
                    [SupportEmail] nvarchar(255) NULL,
                    [CustomDomain] nvarchar(255) NULL,
                    [HideTradeLikeBranding] bit NOT NULL CONSTRAINT [DF_TenantBranding_HideTradeLikeBranding] DEFAULT 0,
                    [UpdatedAtUtc] datetime2 NOT NULL CONSTRAINT [DF_TenantBranding_UpdatedAtUtc] DEFAULT SYSUTCDATETIME()
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_TenantBranding_TenantId' AND object_id = OBJECT_ID(N'[dbo].[TenantBranding]'))
                CREATE UNIQUE INDEX [UX_TenantBranding_TenantId] ON [dbo].[TenantBranding] ([TenantId]);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TenantBranding_CustomDomain' AND object_id = OBJECT_ID(N'[dbo].[TenantBranding]'))
                CREATE INDEX [IX_TenantBranding_CustomDomain] ON [dbo].[TenantBranding] ([CustomDomain]);
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID(N'[dbo].[ImportJobs]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ImportJobs] (
                    [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_ImportJobs] PRIMARY KEY,
                    [TenantId] int NOT NULL,
                    [Entity] nvarchar(40) NOT NULL,
                    [FileName] nvarchar(260) NOT NULL,
                    [Status] nvarchar(40) NOT NULL,
                    [TotalRows] int NOT NULL CONSTRAINT [DF_ImportJobs_TotalRows] DEFAULT 0,
                    [SucceededRows] int NOT NULL CONSTRAINT [DF_ImportJobs_SucceededRows] DEFAULT 0,
                    [FailedRows] int NOT NULL CONSTRAINT [DF_ImportJobs_FailedRows] DEFAULT 0,
                    [ErrorSummary] nvarchar(1000) NULL,
                    [CreatedAtUtc] datetime2 NOT NULL CONSTRAINT [DF_ImportJobs_CreatedAtUtc] DEFAULT SYSUTCDATETIME(),
                    [StartedAtUtc] datetime2 NULL,
                    [CompletedAtUtc] datetime2 NULL
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ImportJobs_TenantId_CreatedAtUtc' AND object_id = OBJECT_ID(N'[dbo].[ImportJobs]'))
                CREATE INDEX [IX_ImportJobs_TenantId_CreatedAtUtc] ON [dbo].[ImportJobs] ([TenantId], [CreatedAtUtc]);
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID(N'[dbo].[ImportJobErrors]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ImportJobErrors] (
                    [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_ImportJobErrors] PRIMARY KEY,
                    [ImportJobId] int NOT NULL,
                    [RowNumber] int NOT NULL,
                    [FieldName] nvarchar(120) NULL,
                    [Message] nvarchar(1000) NOT NULL,
                    [RawRow] nvarchar(max) NULL,
                    [CreatedAtUtc] datetime2 NOT NULL CONSTRAINT [DF_ImportJobErrors_CreatedAtUtc] DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT [FK_ImportJobErrors_ImportJobs_ImportJobId] FOREIGN KEY ([ImportJobId])
                        REFERENCES [dbo].[ImportJobs] ([Id]) ON DELETE CASCADE
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ImportJobErrors_ImportJobId_RowNumber' AND object_id = OBJECT_ID(N'[dbo].[ImportJobErrors]'))
                CREATE INDEX [IX_ImportJobErrors_ImportJobId_RowNumber] ON [dbo].[ImportJobErrors] ([ImportJobId], [RowNumber]);
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID(N'[dbo].[ImportedInvoices]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[ImportedInvoices] (
                    [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_ImportedInvoices] PRIMARY KEY,
                    [TenantId] int NOT NULL,
                    [InvoiceNumber] nvarchar(80) NOT NULL,
                    [CustomerName] nvarchar(180) NOT NULL,
                    [CustomerEmail] nvarchar(255) NULL,
                    [IssueDate] datetime2 NOT NULL,
                    [DueDate] datetime2 NULL,
                    [Total] decimal(18,2) NOT NULL,
                    [Status] nvarchar(40) NOT NULL,
                    [Notes] nvarchar(4000) NULL,
                    [CreatedAtUtc] datetime2 NOT NULL CONSTRAINT [DF_ImportedInvoices_CreatedAtUtc] DEFAULT SYSUTCDATETIME()
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ImportedInvoices_TenantId_IssueDate' AND object_id = OBJECT_ID(N'[dbo].[ImportedInvoices]'))
                CREATE INDEX [IX_ImportedInvoices_TenantId_IssueDate] ON [dbo].[ImportedInvoices] ([TenantId], [IssueDate]);
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID(N'[dbo].[WebhookSubscriptions]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[WebhookSubscriptions] (
                    [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_WebhookSubscriptions] PRIMARY KEY,
                    [TenantId] int NOT NULL,
                    [TargetUrl] nvarchar(2048) NOT NULL,
                    [EventsJson] nvarchar(1000) NOT NULL,
                    [SigningSecret] nvarchar(120) NOT NULL,
                    [IsActive] bit NOT NULL CONSTRAINT [DF_WebhookSubscriptions_IsActive] DEFAULT 1,
                    [CreatedAtUtc] datetime2 NOT NULL CONSTRAINT [DF_WebhookSubscriptions_CreatedAtUtc] DEFAULT SYSUTCDATETIME(),
                    [LastDeliveryAtUtc] datetime2 NULL
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WebhookSubscriptions_TenantId' AND object_id = OBJECT_ID(N'[dbo].[WebhookSubscriptions]'))
                CREATE INDEX [IX_WebhookSubscriptions_TenantId] ON [dbo].[WebhookSubscriptions] ([TenantId]);
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID(N'[dbo].[WebhookDeliveries]', N'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[WebhookDeliveries] (
                    [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_WebhookDeliveries] PRIMARY KEY,
                    [TenantId] int NOT NULL,
                    [SubscriptionId] int NOT NULL,
                    [EventName] nvarchar(120) NOT NULL,
                    [Payload] nvarchar(max) NOT NULL,
                    [Status] nvarchar(40) NOT NULL,
                    [AttemptCount] int NOT NULL CONSTRAINT [DF_WebhookDeliveries_AttemptCount] DEFAULT 0,
                    [NextAttemptAtUtc] datetime2 NOT NULL,
                    [LastAttemptAtUtc] datetime2 NULL,
                    [LastError] nvarchar(1000) NULL,
                    [CreatedAtUtc] datetime2 NOT NULL CONSTRAINT [DF_WebhookDeliveries_CreatedAtUtc] DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT [FK_WebhookDeliveries_WebhookSubscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId])
                        REFERENCES [dbo].[WebhookSubscriptions] ([Id]) ON DELETE CASCADE
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WebhookDeliveries_Status_NextAttemptAtUtc' AND object_id = OBJECT_ID(N'[dbo].[WebhookDeliveries]'))
                CREATE INDEX [IX_WebhookDeliveries_Status_NextAttemptAtUtc] ON [dbo].[WebhookDeliveries] ([Status], [NextAttemptAtUtc]);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DROP TABLE IF EXISTS [dbo].[WebhookDeliveries];
            DROP TABLE IF EXISTS [dbo].[WebhookSubscriptions];
            DROP TABLE IF EXISTS [dbo].[ImportedInvoices];
            DROP TABLE IF EXISTS [dbo].[ImportJobErrors];
            DROP TABLE IF EXISTS [dbo].[ImportJobs];
            DROP TABLE IF EXISTS [dbo].[TenantBranding];
            DROP TABLE IF EXISTS [dbo].[ApiClients];
            """);
    }
}
