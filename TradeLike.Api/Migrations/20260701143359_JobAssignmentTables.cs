using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class JobAssignmentTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobId = table.Column<int>(type: "int", nullable: false),
                    LeadStaffMemberId = table.Column<int>(type: "int", nullable: true),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobAssignments_CustomerStaffMembers_LeadStaffMemberId",
                        column: x => x.LeadStaffMemberId,
                        principalTable: "CustomerStaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_JobAssignments_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JobAssignmentStaff",
                columns: table => new
                {
                    JobAssignmentId = table.Column<int>(type: "int", nullable: false),
                    StaffMemberId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobAssignmentStaff", x => new { x.JobAssignmentId, x.StaffMemberId });
                    table.ForeignKey(
                        name: "FK_JobAssignmentStaff_CustomerStaffMembers_StaffMemberId",
                        column: x => x.StaffMemberId,
                        principalTable: "CustomerStaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobAssignmentStaff_JobAssignments_JobAssignmentId",
                        column: x => x.JobAssignmentId,
                        principalTable: "JobAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobAssignments_JobId",
                table: "JobAssignments",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_JobAssignments_LeadStaffMemberId",
                table: "JobAssignments",
                column: "LeadStaffMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_JobAssignments_TenantId_JobId",
                table: "JobAssignments",
                columns: new[] { "TenantId", "JobId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobAssignmentStaff_StaffMemberId",
                table: "JobAssignmentStaff",
                column: "StaffMemberId");

            migrationBuilder.Sql("""
IF COL_LENGTH('Jobs', 'AssignedStaffMemberIds') IS NOT NULL
BEGIN
    INSERT INTO [JobAssignments] ([JobId], [LeadStaffMemberId], [TenantId], [CreatedAt])
    SELECT
        [Jobs].[Id],
        CASE
            WHEN [Jobs].[LeadStaffMemberId] IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM [CustomerStaffMembers]
                    WHERE [CustomerStaffMembers].[Id] = [Jobs].[LeadStaffMemberId]
                      AND [CustomerStaffMembers].[CompanyUserId] = [Jobs].[TenantId])
            THEN [Jobs].[LeadStaffMemberId]
            ELSE NULL
        END,
        [Jobs].[TenantId],
        SYSUTCDATETIME()
    FROM [Jobs]
    WHERE NOT EXISTS (
            SELECT 1
            FROM [JobAssignments]
            WHERE [JobAssignments].[JobId] = [Jobs].[Id]
              AND [JobAssignments].[TenantId] = [Jobs].[TenantId])
      AND (
            [Jobs].[LeadStaffMemberId] IS NOT NULL
            OR NULLIF(LTRIM(RTRIM([Jobs].[AssignedStaffMemberIds])), N'') IS NOT NULL);

    INSERT INTO [JobAssignmentStaff] ([JobAssignmentId], [StaffMemberId])
    SELECT DISTINCT
        [JobAssignments].[Id],
        [ParsedStaff].[StaffMemberId]
    FROM [Jobs]
    INNER JOIN [JobAssignments]
        ON [JobAssignments].[JobId] = [Jobs].[Id]
       AND [JobAssignments].[TenantId] = [Jobs].[TenantId]
    CROSS APPLY STRING_SPLIT([Jobs].[AssignedStaffMemberIds], N',') AS [SplitStaff]
    CROSS APPLY (
        SELECT TRY_CAST(LTRIM(RTRIM([SplitStaff].[value])) AS int) AS [StaffMemberId]
    ) AS [ParsedStaff]
    INNER JOIN [CustomerStaffMembers]
        ON [CustomerStaffMembers].[Id] = [ParsedStaff].[StaffMemberId]
       AND [CustomerStaffMembers].[CompanyUserId] = [Jobs].[TenantId]
    WHERE [ParsedStaff].[StaffMemberId] IS NOT NULL
      AND NOT EXISTS (
            SELECT 1
            FROM [JobAssignmentStaff]
            WHERE [JobAssignmentStaff].[JobAssignmentId] = [JobAssignments].[Id]
              AND [JobAssignmentStaff].[StaffMemberId] = [ParsedStaff].[StaffMemberId]);

    ALTER TABLE [Jobs] DROP COLUMN [AssignedStaffMemberIds];
END;
""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
IF COL_LENGTH('Jobs', 'AssignedStaffMemberIds') IS NULL
BEGIN
    ALTER TABLE [Jobs] ADD [AssignedStaffMemberIds] nvarchar(max) NULL;

    UPDATE [Jobs]
    SET [AssignedStaffMemberIds] = [StaffCsv].[AssignedStaffMemberIds]
    FROM [Jobs]
    INNER JOIN [JobAssignments]
        ON [JobAssignments].[JobId] = [Jobs].[Id]
       AND [JobAssignments].[TenantId] = [Jobs].[TenantId]
    CROSS APPLY (
        SELECT STUFF((
            SELECT N',' + CAST([JobAssignmentStaff].[StaffMemberId] AS nvarchar(20))
            FROM [JobAssignmentStaff]
            WHERE [JobAssignmentStaff].[JobAssignmentId] = [JobAssignments].[Id]
            ORDER BY [JobAssignmentStaff].[StaffMemberId]
            FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 1, N'') AS [AssignedStaffMemberIds]
    ) AS [StaffCsv];
END;
""");

            migrationBuilder.DropTable(
                name: "JobAssignmentStaff");

            migrationBuilder.DropTable(
                name: "JobAssignments");
        }
    }
}
