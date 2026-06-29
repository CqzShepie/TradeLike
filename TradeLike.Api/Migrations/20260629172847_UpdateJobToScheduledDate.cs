using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateJobToScheduledDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Time",
                table: "Jobs");

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledDate",
                table: "Jobs",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScheduledDate",
                table: "Jobs");

            migrationBuilder.AddColumn<string>(
                name: "Time",
                table: "Jobs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
