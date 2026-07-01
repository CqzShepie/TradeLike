using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class StaffLeaveRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StaffLeaveRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    StaffMemberId = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffLeaveRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffLeaveRequests_CustomerStaffMembers_StaffMemberId",
                        column: x => x.StaffMemberId,
                        principalTable: "CustomerStaffMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_StaffMemberId",
                table: "StaffLeaveRequests",
                column: "StaffMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_TenantId_StaffMemberId",
                table: "StaffLeaveRequests",
                columns: new[] { "TenantId", "StaffMemberId" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffLeaveRequests_TenantId_StartDate_EndDate",
                table: "StaffLeaveRequests",
                columns: new[] { "TenantId", "StartDate", "EndDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StaffLeaveRequests");
        }
    }
}
