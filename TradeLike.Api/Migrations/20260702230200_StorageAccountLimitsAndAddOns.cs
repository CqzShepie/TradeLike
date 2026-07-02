using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class StorageAccountLimitsAndAddOns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "IncludedStorageBytes",
                table: "Plans",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StorageAddOnPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ExtraStorageBytes = table.Column<long>(type: "bigint", nullable: false),
                    MonthlyPricePence = table.Column<int>(type: "int", nullable: false),
                    StripePriceId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorageAddOnPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StorageObjects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    BlobKey = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    LinkedEntityType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    LinkedEntityId = table.Column<int>(type: "int", nullable: true),
                    IsGenerated = table.Column<bool>(type: "bit", nullable: false),
                    ParentStorageObjectId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Active"),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorageObjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StorageObjects_StorageObjects_ParentStorageObjectId",
                        column: x => x.ParentStorageObjectId,
                        principalTable: "StorageObjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TenantStorageAccounts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    IncludedStorageBytes = table.Column<long>(type: "bigint", nullable: false),
                    PurchasedStorageBytes = table.Column<long>(type: "bigint", nullable: false),
                    ManualStorageOverrideBytes = table.Column<long>(type: "bigint", nullable: true),
                    UsedStorageBytes = table.Column<long>(type: "bigint", nullable: false),
                    WarningLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "OK"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantStorageAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantStorageAccounts_Users_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TenantStorageAddOns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    StorageAddOnPlanId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    StripeSubscriptionId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    StripeSubscriptionItemId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    StripePriceId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    CurrentPeriodEndUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelAtPeriodEnd = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantStorageAddOns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantStorageAddOns_StorageAddOnPlans_StorageAddOnPlanId",
                        column: x => x.StorageAddOnPlanId,
                        principalTable: "StorageAddOnPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StorageUsageEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    StorageObjectId = table.Column<int>(type: "int", nullable: true),
                    DeltaBytes = table.Column<long>(type: "bigint", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ActorUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorageUsageEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StorageUsageEvents_StorageObjects_StorageObjectId",
                        column: x => x.StorageObjectId,
                        principalTable: "StorageObjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 1,
                column: "IncludedStorageBytes",
                value: 10000000000L);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 2,
                column: "IncludedStorageBytes",
                value: 50000000000L);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 3,
                column: "IncludedStorageBytes",
                value: 250000000000L);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: 4,
                column: "IncludedStorageBytes",
                value: null);

            migrationBuilder.InsertData(
                table: "StorageAddOnPlans",
                columns: new[] { "Id", "Code", "ExtraStorageBytes", "IsActive", "Label", "MonthlyPricePence", "StripePriceId" },
                values: new object[,]
                {
                    { 1, "extra-50gb", 50000000000L, true, "Extra 50GB", 495, null },
                    { 2, "extra-100gb", 100000000000L, true, "Extra 100GB", 895, null },
                    { 3, "extra-250gb", 250000000000L, true, "Extra 250GB", 1795, null },
                    { 4, "extra-500gb", 500000000000L, true, "Extra 500GB", 2995, null },
                    { 5, "extra-1tb", 1000000000000L, true, "Extra 1TB", 4995, null }
                });

            migrationBuilder.Sql("""
                INSERT INTO [TenantStorageAccounts] ([TenantId], [IncludedStorageBytes], [PurchasedStorageBytes], [UsedStorageBytes], [WarningLevel], [UpdatedAtUtc])
                SELECT
                    s.[TenantId],
                    COALESCE(p.[IncludedStorageBytes], 0),
                    0,
                    COALESCE(activeObjects.[UsedStorageBytes], 0),
                    CASE
                        WHEN COALESCE(p.[IncludedStorageBytes], 0) <= 0 THEN 'OK'
                        WHEN COALESCE(activeObjects.[UsedStorageBytes], 0) >= COALESCE(p.[IncludedStorageBytes], 0) THEN 'Blocked'
                        WHEN COALESCE(activeObjects.[UsedStorageBytes], 0) >= COALESCE(p.[IncludedStorageBytes], 0) * 0.95 THEN 'Critical'
                        WHEN COALESCE(activeObjects.[UsedStorageBytes], 0) >= COALESCE(p.[IncludedStorageBytes], 0) * 0.80 THEN 'Warning'
                        ELSE 'OK'
                    END,
                    SYSUTCDATETIME()
                FROM [Subscriptions] s
                INNER JOIN [Plans] p ON p.[Id] = s.[PlanId]
                LEFT JOIN (
                    SELECT [TenantId], SUM([SizeBytes]) AS [UsedStorageBytes]
                    FROM [StorageObjects]
                    WHERE [Status] = 'Active'
                    GROUP BY [TenantId]
                ) activeObjects ON activeObjects.[TenantId] = s.[TenantId]
                WHERE NOT EXISTS (
                    SELECT 1 FROM [TenantStorageAccounts] existing WHERE existing.[TenantId] = s.[TenantId]
                );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_StorageAddOnPlans_Code",
                table: "StorageAddOnPlans",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StorageObjects_BlobKey",
                table: "StorageObjects",
                column: "BlobKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StorageObjects_ParentStorageObjectId",
                table: "StorageObjects",
                column: "ParentStorageObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_StorageObjects_TenantId_LinkedEntityType_LinkedEntityId",
                table: "StorageObjects",
                columns: new[] { "TenantId", "LinkedEntityType", "LinkedEntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_StorageObjects_TenantId_Status",
                table: "StorageObjects",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageEvents_StorageObjectId",
                table: "StorageUsageEvents",
                column: "StorageObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_StorageUsageEvents_TenantId_CreatedAtUtc",
                table: "StorageUsageEvents",
                columns: new[] { "TenantId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantStorageAccounts_TenantId",
                table: "TenantStorageAccounts",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantStorageAddOns_StorageAddOnPlanId",
                table: "TenantStorageAddOns",
                column: "StorageAddOnPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantStorageAddOns_StripeSubscriptionId",
                table: "TenantStorageAddOns",
                column: "StripeSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantStorageAddOns_TenantId_Status",
                table: "TenantStorageAddOns",
                columns: new[] { "TenantId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StorageUsageEvents");

            migrationBuilder.DropTable(
                name: "TenantStorageAccounts");

            migrationBuilder.DropTable(
                name: "TenantStorageAddOns");

            migrationBuilder.DropTable(
                name: "StorageObjects");

            migrationBuilder.DropTable(
                name: "StorageAddOnPlans");

            migrationBuilder.DropColumn(
                name: "IncludedStorageBytes",
                table: "Plans");
        }
    }
}
