using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class Phase41_44 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('AdminAuditLogs', 'UserId') IS NULL
                    ALTER TABLE AdminAuditLogs ADD UserId int NULL;

                IF COL_LENGTH('AdminAuditLogs', 'EntityType') IS NULL
                    ALTER TABLE AdminAuditLogs ADD EntityType nvarchar(80) NOT NULL CONSTRAINT DF_AdminAuditLogs_EntityType DEFAULT(N'');

                IF COL_LENGTH('AdminAuditLogs', 'EntityId') IS NULL
                    ALTER TABLE AdminAuditLogs ADD EntityId nvarchar(120) NULL;

                IF COL_LENGTH('AdminAuditLogs', 'DiffJson') IS NULL
                    ALTER TABLE AdminAuditLogs ADD DiffJson nvarchar(max) NULL;

                IF COL_LENGTH('AdminAuditLogs', 'CreatedAtUtc') IS NULL
                    ALTER TABLE AdminAuditLogs ADD CreatedAtUtc datetime2 NOT NULL CONSTRAINT DF_AdminAuditLogs_CreatedAtUtc DEFAULT(SYSUTCDATETIME());

                IF COL_LENGTH('BusinessSettings', 'LogRetentionDays') IS NULL
                    ALTER TABLE BusinessSettings ADD LogRetentionDays int NOT NULL CONSTRAINT DF_BusinessSettings_LogRetentionDays DEFAULT(365);

                IF OBJECT_ID(N'RolePermissions', N'U') IS NULL
                BEGIN
                    CREATE TABLE RolePermissions
                    (
                        RoleName nvarchar(80) NOT NULL,
                        Entity nvarchar(80) NOT NULL,
                        Field nvarchar(120) NOT NULL,
                        Permission nvarchar(20) NOT NULL,
                        UpdatedAtUtc datetime2 NOT NULL,
                        CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleName, Entity, Field)
                    );
                END

                IF OBJECT_ID(N'ApiUsageStats', N'U') IS NULL
                BEGIN
                    CREATE TABLE ApiUsageStats
                    (
                        Id int IDENTITY(1,1) NOT NULL,
                        TenantId int NOT NULL,
                        PeriodStartUtc datetime2 NOT NULL,
                        Requests int NOT NULL,
                        ExportCalls int NOT NULL,
                        AutomationRuns int NOT NULL,
                        UpdatedAtUtc datetime2 NOT NULL,
                        CONSTRAINT PK_ApiUsageStats PRIMARY KEY (Id)
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AdminAuditLogs_TenantId_CreatedAtUtc' AND object_id = OBJECT_ID(N'AdminAuditLogs'))
                    CREATE INDEX IX_AdminAuditLogs_TenantId_CreatedAtUtc ON AdminAuditLogs (TenantId, CreatedAtUtc);

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AdminAuditLogs_UserId' AND object_id = OBJECT_ID(N'AdminAuditLogs'))
                    CREATE INDEX IX_AdminAuditLogs_UserId ON AdminAuditLogs (UserId);

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ApiUsageStats_TenantId_PeriodStartUtc' AND object_id = OBJECT_ID(N'ApiUsageStats'))
                    CREATE UNIQUE INDEX IX_ApiUsageStats_TenantId_PeriodStartUtc ON ApiUsageStats (TenantId, PeriodStartUtc);

                IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = N'CustomerEmployee' AND Entity = N'Jobs' AND Field = N'InternalNotes')
                    INSERT INTO RolePermissions (RoleName, Entity, Field, Permission, UpdatedAtUtc)
                    VALUES (N'CustomerEmployee', N'Jobs', N'InternalNotes', N'Hidden', SYSUTCDATETIME());

                IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = N'CustomerManager' AND Entity = N'Quote' AND Field = N'MarginPence')
                    INSERT INTO RolePermissions (RoleName, Entity, Field, Permission, UpdatedAtUtc)
                    VALUES (N'CustomerManager', N'Quote', N'MarginPence', N'Read', SYSUTCDATETIME());

                IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = N'CustomerDirector' AND Entity = N'*' AND Field = N'*')
                    INSERT INTO RolePermissions (RoleName, Entity, Field, Permission, UpdatedAtUtc)
                    VALUES (N'CustomerDirector', N'*', N'*', N'Write', SYSUTCDATETIME());

                IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = N'Director' AND Entity = N'*' AND Field = N'*')
                    INSERT INTO RolePermissions (RoleName, Entity, Field, Permission, UpdatedAtUtc)
                    VALUES (N'Director', N'*', N'*', N'Write', SYSUTCDATETIME());

                IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleName = N'Staff' AND Entity = N'*' AND Field = N'*')
                    INSERT INTO RolePermissions (RoleName, Entity, Field, Permission, UpdatedAtUtc)
                    VALUES (N'Staff', N'*', N'*', N'Write', SYSUTCDATETIME());
                """);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally left non-destructive because the SQL above is idempotent and may
            // run after earlier branch migrations that already created the same tables/columns.
        }
    }
}
