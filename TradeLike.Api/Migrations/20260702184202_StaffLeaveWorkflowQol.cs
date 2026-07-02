using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class StaffLeaveWorkflowQol : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "StaffLeaveRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DecidedAt",
                table: "StaffLeaveRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DecidedByUserId",
                table: "StaffLeaveRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecisionNote",
                table: "StaffLeaveRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LeaveType",
                table: "StaffLeaveRequests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Paid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "StaffLeaveRequests");

            migrationBuilder.DropColumn(
                name: "DecidedAt",
                table: "StaffLeaveRequests");

            migrationBuilder.DropColumn(
                name: "DecidedByUserId",
                table: "StaffLeaveRequests");

            migrationBuilder.DropColumn(
                name: "DecisionNote",
                table: "StaffLeaveRequests");

            migrationBuilder.DropColumn(
                name: "LeaveType",
                table: "StaffLeaveRequests");
        }
    }
}
