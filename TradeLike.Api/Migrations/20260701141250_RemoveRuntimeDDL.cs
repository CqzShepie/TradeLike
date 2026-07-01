using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRuntimeDDL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
IF COL_LENGTH('Jobs', 'AssignedStaffMemberIds') IS NULL
    ALTER TABLE [Jobs] ADD [AssignedStaffMemberIds] nvarchar(max) NULL;

IF COL_LENGTH('Jobs', 'AssignedTeamId') IS NULL
    ALTER TABLE [Jobs] ADD [AssignedTeamId] int NULL;

IF COL_LENGTH('Jobs', 'CalendarColour') IS NULL
    ALTER TABLE [Jobs] ADD [CalendarColour] nvarchar(40) NULL;

IF COL_LENGTH('Jobs', 'LeadStaffMemberId') IS NULL
    ALTER TABLE [Jobs] ADD [LeadStaffMemberId] int NULL;

IF COL_LENGTH('Jobs', 'ScheduledEndDate') IS NULL
    ALTER TABLE [Jobs] ADD [ScheduledEndDate] datetime2 NULL;

IF COL_LENGTH('AdminAuditLogs', 'TenantId') IS NULL
    ALTER TABLE [AdminAuditLogs] ADD [TenantId] int NOT NULL CONSTRAINT [DF_AdminAuditLogs_TenantId] DEFAULT 0;

IF OBJECT_ID(N'[BusinessSettings]', N'U') IS NULL
BEGIN
    CREATE TABLE [BusinessSettings]
    (
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_BusinessSettings] PRIMARY KEY,
        [BusinessName] nvarchar(180) NOT NULL,
        [LegalName] nvarchar(180) NULL,
        [LogoUrl] nvarchar(500) NULL,
        [AddressLine1] nvarchar(220) NULL,
        [AddressLine2] nvarchar(220) NULL,
        [Town] nvarchar(120) NULL,
        [County] nvarchar(120) NULL,
        [Postcode] nvarchar(30) NULL,
        [Country] nvarchar(120) NULL,
        [Phone] nvarchar(40) NULL,
        [Email] nvarchar(255) NULL,
        [Website] nvarchar(255) NULL,
        [VatNumber] nvarchar(60) NULL,
        [DefaultVatRate] decimal(5,2) NOT NULL CONSTRAINT [DF_BusinessSettings_DefaultVatRate] DEFAULT 20.0,
        [QuotePrefix] nvarchar(20) NOT NULL CONSTRAINT [DF_BusinessSettings_QuotePrefix] DEFAULT N'Q',
        [InvoicePrefix] nvarchar(20) NOT NULL CONSTRAINT [DF_BusinessSettings_InvoicePrefix] DEFAULT N'INV',
        [PaymentTerms] nvarchar(1000) NULL,
        [BankName] nvarchar(120) NULL,
        [BankAccountName] nvarchar(180) NULL,
        [BankSortCode] nvarchar(20) NULL,
        [BankAccountNumber] nvarchar(40) NULL,
        [EmailFooter] nvarchar(2000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL
    );
END;

IF OBJECT_ID(N'[CustomerStaffMembers]', N'U') IS NULL
BEGIN
    CREATE TABLE [CustomerStaffMembers]
    (
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CustomerStaffMembers] PRIMARY KEY,
        [CompanyUserId] int NOT NULL,
        [FirstName] nvarchar(100) NOT NULL,
        [LastName] nvarchar(100) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [Phone] nvarchar(80) NOT NULL,
        [RoleName] nvarchar(120) NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [PermissionPresetName] nvarchar(120) NOT NULL,
        [Skills] nvarchar(500) NOT NULL,
        [ServiceArea] nvarchar(250) NOT NULL,
        [WorkingHours] nvarchar(250) NOT NULL,
        [CalendarColour] nvarchar(40) NOT NULL,
        [IsTwoFactorRequired] bit NOT NULL,
        [LastLoginAt] datetime2 NULL,
        [InviteToken] nvarchar(120) NULL,
        [InviteSentAt] datetime2 NULL,
        [InviteAcceptedAt] datetime2 NULL,
        [ResetPasswordRequestedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL
    );
END;

IF OBJECT_ID(N'[CustomerStaffMemberTeams]', N'U') IS NULL
BEGIN
    CREATE TABLE [CustomerStaffMemberTeams]
    (
        [StaffMemberId] int NOT NULL,
        [TeamId] int NOT NULL,
        CONSTRAINT [PK_CustomerStaffMemberTeams] PRIMARY KEY ([StaffMemberId], [TeamId])
    );
END;

IF OBJECT_ID(N'[CustomerStaffSecurityRequests]', N'U') IS NULL
BEGIN
    CREATE TABLE [CustomerStaffSecurityRequests]
    (
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CustomerStaffSecurityRequests] PRIMARY KEY,
        [CompanyUserId] int NOT NULL,
        [StaffMemberId] int NOT NULL,
        [RequestType] nvarchar(80) NOT NULL,
        [Status] nvarchar(80) NOT NULL,
        [CreatedAt] datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'[CustomerStaffTeams]', N'U') IS NULL
BEGIN
    CREATE TABLE [CustomerStaffTeams]
    (
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CustomerStaffTeams] PRIMARY KEY,
        [CompanyUserId] int NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Colour] nvarchar(40) NOT NULL,
        [TeamLeadStaffId] int NULL,
        [DefaultJobType] nvarchar(120) NOT NULL,
        [ServiceArea] nvarchar(250) NOT NULL,
        [WorkingHours] nvarchar(250) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AdminAuditLogs_TenantId' AND object_id = OBJECT_ID(N'[AdminAuditLogs]'))
    CREATE INDEX [IX_AdminAuditLogs_TenantId] ON [AdminAuditLogs] ([TenantId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerStaffMembers_CompanyUserId' AND object_id = OBJECT_ID(N'[CustomerStaffMembers]'))
    CREATE INDEX [IX_CustomerStaffMembers_CompanyUserId] ON [CustomerStaffMembers] ([CompanyUserId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerStaffMembers_CompanyUserId_Email' AND object_id = OBJECT_ID(N'[CustomerStaffMembers]'))
    CREATE UNIQUE INDEX [IX_CustomerStaffMembers_CompanyUserId_Email] ON [CustomerStaffMembers] ([CompanyUserId], [Email]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerStaffMembers_InviteToken' AND object_id = OBJECT_ID(N'[CustomerStaffMembers]'))
    CREATE INDEX [IX_CustomerStaffMembers_InviteToken] ON [CustomerStaffMembers] ([InviteToken]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerStaffMemberTeams_TeamId' AND object_id = OBJECT_ID(N'[CustomerStaffMemberTeams]'))
    CREATE INDEX [IX_CustomerStaffMemberTeams_TeamId] ON [CustomerStaffMemberTeams] ([TeamId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerStaffSecurityRequests_CompanyUserId' AND object_id = OBJECT_ID(N'[CustomerStaffSecurityRequests]'))
    CREATE INDEX [IX_CustomerStaffSecurityRequests_CompanyUserId] ON [CustomerStaffSecurityRequests] ([CompanyUserId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerStaffSecurityRequests_StaffMemberId' AND object_id = OBJECT_ID(N'[CustomerStaffSecurityRequests]'))
    CREATE INDEX [IX_CustomerStaffSecurityRequests_StaffMemberId] ON [CustomerStaffSecurityRequests] ([StaffMemberId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustomerStaffTeams_CompanyUserId' AND object_id = OBJECT_ID(N'[CustomerStaffTeams]'))
    CREATE INDEX [IX_CustomerStaffTeams_CompanyUserId] ON [CustomerStaffTeams] ([CompanyUserId]);
""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
DROP TABLE IF EXISTS [BusinessSettings];
DROP TABLE IF EXISTS [CustomerStaffMemberTeams];
DROP TABLE IF EXISTS [CustomerStaffSecurityRequests];
DROP TABLE IF EXISTS [CustomerStaffMembers];
DROP TABLE IF EXISTS [CustomerStaffTeams];

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AdminAuditLogs_TenantId' AND object_id = OBJECT_ID(N'[AdminAuditLogs]'))
    DROP INDEX [IX_AdminAuditLogs_TenantId] ON [AdminAuditLogs];

IF COL_LENGTH('Jobs', 'AssignedStaffMemberIds') IS NOT NULL
    ALTER TABLE [Jobs] DROP COLUMN [AssignedStaffMemberIds];

IF COL_LENGTH('Jobs', 'AssignedTeamId') IS NOT NULL
    ALTER TABLE [Jobs] DROP COLUMN [AssignedTeamId];

IF COL_LENGTH('Jobs', 'CalendarColour') IS NOT NULL
    ALTER TABLE [Jobs] DROP COLUMN [CalendarColour];

IF COL_LENGTH('Jobs', 'LeadStaffMemberId') IS NOT NULL
    ALTER TABLE [Jobs] DROP COLUMN [LeadStaffMemberId];

IF COL_LENGTH('Jobs', 'ScheduledEndDate') IS NOT NULL
    ALTER TABLE [Jobs] DROP COLUMN [ScheduledEndDate];

IF COL_LENGTH('AdminAuditLogs', 'TenantId') IS NOT NULL
    ALTER TABLE [AdminAuditLogs] DROP COLUMN [TenantId];
""");
        }
    }
}
