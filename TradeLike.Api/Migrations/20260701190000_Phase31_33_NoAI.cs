using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TradeLike.Api.Data;

#nullable disable

namespace TradeLike.Api.Migrations
{
    [DbContext(typeof(TradeLikeDbContext))]
    [Migration("20260701190000_Phase31_33_NoAI")]
    public partial class Phase31_33_NoAI : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Enabled",
                table: "Workflows",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxRunAttempts",
                table: "Workflows",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.CreateTable(
                name: "Expenses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    StaffId = table.Column<int>(type: "int", nullable: false),
                    DateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    AmountPence = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ReceiptFileId = table.Column<int>(type: "int", nullable: true),
                    Miles = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expenses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MileageRates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    PencePerMile = table.Column<int>(type: "int", nullable: false),
                    EffectiveFromUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MileageRates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PushSubscriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    P256dh = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Auth = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PushSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TenantId_DateUtc",
                table: "Expenses",
                columns: new[] { "TenantId", "DateUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_TenantId_StaffId",
                table: "Expenses",
                columns: new[] { "TenantId", "StaffId" });

            migrationBuilder.CreateIndex(
                name: "IX_MileageRates_TenantId_EffectiveFromUtc",
                table: "MileageRates",
                columns: new[] { "TenantId", "EffectiveFromUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PushSubscriptions_Endpoint",
                table: "PushSubscriptions",
                column: "Endpoint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PushSubscriptions_TenantId_UserId",
                table: "PushSubscriptions",
                columns: new[] { "TenantId", "UserId" });

            migrationBuilder.Sql(
                """
                INSERT INTO MileageRates (TenantId, PencePerMile, EffectiveFromUtc)
                SELECT Id, 45, SYSUTCDATETIME()
                FROM Users
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM MileageRates
                    WHERE MileageRates.TenantId = Users.Id
                )
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Expenses");
            migrationBuilder.DropTable(name: "MileageRates");
            migrationBuilder.DropTable(name: "PushSubscriptions");

            migrationBuilder.DropColumn(
                name: "Enabled",
                table: "Workflows");

            migrationBuilder.DropColumn(
                name: "MaxRunAttempts",
                table: "Workflows");
        }
    }
}
