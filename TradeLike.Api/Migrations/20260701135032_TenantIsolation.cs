using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class TenantIsolation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Quotes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "QuoteLineItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Jobs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Engineers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Customers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_TenantId",
                table: "Quotes",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_QuoteLineItems_TenantId",
                table: "QuoteLineItems",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_TenantId",
                table: "Jobs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Engineers_TenantId",
                table: "Engineers",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_TenantId",
                table: "Customers",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Quotes_TenantId",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_QuoteLineItems_TenantId",
                table: "QuoteLineItems");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_TenantId",
                table: "Jobs");

            migrationBuilder.DropIndex(
                name: "IX_Engineers_TenantId",
                table: "Engineers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_TenantId",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "QuoteLineItems");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Engineers");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Customers");
        }
    }
}
