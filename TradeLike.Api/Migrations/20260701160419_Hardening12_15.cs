using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class Hardening12_15 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Quotes_TenantId_CreatedAt",
                table: "Quotes",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_TenantId_ScheduledDate",
                table: "Jobs",
                columns: new[] { "TenantId", "ScheduledDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Quotes_TenantId_CreatedAt",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_TenantId_ScheduledDate",
                table: "Jobs");
        }
    }
}
