using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class PricingTiersAndManagerRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "CustomerDirector",
                oldClrType: typeof(string),
                oldType: "nvarchar(40)",
                oldMaxLength: 40,
                oldDefaultValue: "Customer");

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE [Users] SET [TenantId] = [Id] WHERE [TenantId] = 0;");

            migrationBuilder.Sql("UPDATE [Users] SET [Role] = N'CustomerManager' WHERE [Role] = N'Customer';");

            migrationBuilder.CreateTable(
                name: "Plans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    MonthlyPricePence = table.Column<int>(type: "int", nullable: true),
                    MaxIncludedUsers = table.Column<int>(type: "int", nullable: true),
                    AdditionalUserCostPence = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Plans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    SeatsPurchased = table.Column<int>(type: "int", nullable: false),
                    BillingStartUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NextInvoiceDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Subscriptions_Plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Subscriptions_Users_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Plans",
                columns: new[] { "Id", "AdditionalUserCostPence", "CreatedAt", "MaxIncludedUsers", "MonthlyPricePence", "Name" },
                values: new object[,]
                {
                    { 1, null, new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, 3500, "Solo" },
                    { 2, null, new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), 10, 7500, "Team" },
                    { 3, 500, new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), 25, 15000, "Business" },
                    { 4, null, new DateTime(2026, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, "Enterprise" }
                });

            migrationBuilder.Sql(
                """
                INSERT INTO [Subscriptions] ([TenantId], [PlanId], [SeatsPurchased], [BillingStartUtc], [NextInvoiceDateUtc], [Status])
                SELECT DISTINCT [TenantId], 1, 1, SYSUTCDATETIME(), DATEADD(month, 1, SYSUTCDATETIME()), N'Trial'
                FROM [Users]
                WHERE [TenantId] > 0
                  AND [Role] IN (N'CustomerDirector', N'CustomerManager', N'CustomerEmployee')
                  AND NOT EXISTS (
                      SELECT 1
                      FROM [Subscriptions] s
                      WHERE s.[TenantId] = [Users].[TenantId])
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId",
                table: "Users",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Plans_Name",
                table: "Plans",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_PlanId",
                table: "Subscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_TenantId",
                table: "Subscriptions",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Subscriptions");

            migrationBuilder.DropTable(
                name: "Plans");

            migrationBuilder.DropIndex(
                name: "IX_Users_TenantId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Users");

            migrationBuilder.Sql("UPDATE [Users] SET [Role] = N'Customer' WHERE [Role] = N'CustomerManager';");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Customer",
                oldClrType: typeof(string),
                oldType: "nvarchar(40)",
                oldMaxLength: 40,
                oldDefaultValue: "CustomerDirector");
        }
    }
}
