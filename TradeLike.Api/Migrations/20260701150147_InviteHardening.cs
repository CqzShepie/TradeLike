using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class InviteHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "InviteExpiresAt",
                table: "CustomerStaffMembers",
                type: "datetime2",
                nullable: true,
                defaultValueSql: "DATEADD(day, 14, SYSUTCDATETIME())");

            migrationBuilder.Sql("""
UPDATE [CustomerStaffMembers]
SET [InviteExpiresAt] = DATEADD(day, 14, COALESCE([InviteSentAt], SYSUTCDATETIME()))
WHERE [Status] = N'InvitePending'
  AND [InviteToken] IS NOT NULL
  AND [InviteExpiresAt] IS NULL;
""");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerStaffMembers_InviteExpiresAt",
                table: "CustomerStaffMembers",
                column: "InviteExpiresAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CustomerStaffMembers_InviteExpiresAt",
                table: "CustomerStaffMembers");

            migrationBuilder.DropColumn(
                name: "InviteExpiresAt",
                table: "CustomerStaffMembers");
        }
    }
}
