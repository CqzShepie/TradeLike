using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class CustomerSettingsTenantScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyNumber",
                table: "BusinessSettings",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultInvoiceNotes",
                table: "BusinessSettings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultJobPriority",
                table: "BusinessSettings",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Normal");

            migrationBuilder.AddColumn<string>(
                name: "DefaultQuoteNotes",
                table: "BusinessSettings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultReportRange",
                table: "BusinessSettings",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "30d");

            migrationBuilder.AddColumn<string>(
                name: "DefaultScheduleView",
                table: "BusinessSettings",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Week");

            migrationBuilder.AddColumn<bool>(
                name: "IncludeArchivedInReports",
                table: "BusinessSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IncludeCompletedInReports",
                table: "BusinessSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "LowStockThreshold",
                table: "BusinessSettings",
                type: "int",
                nullable: false,
                defaultValue: 5);

            migrationBuilder.AddColumn<string>(
                name: "PurchaseOrderPrefix",
                table: "BusinessSettings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "PO");

            migrationBuilder.AddColumn<int>(
                name: "QuoteExpiryDays",
                table: "BusinessSettings",
                type: "int",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<string>(
                name: "ReplyToEmail",
                table: "BusinessSettings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "BusinessSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                """
                IF EXISTS (SELECT 1 FROM [BusinessSettings] WHERE [TenantId] = 0)
                BEGIN
                    INSERT INTO [BusinessSettings]
                    (
                        [TenantId],
                        [BusinessName],
                        [LegalName],
                        [LogoUrl],
                        [AddressLine1],
                        [AddressLine2],
                        [Town],
                        [County],
                        [Postcode],
                        [Country],
                        [Phone],
                        [Email],
                        [Website],
                        [VatNumber],
                        [DefaultVatRate],
                        [QuotePrefix],
                        [InvoicePrefix],
                        [PaymentTerms],
                        [BankName],
                        [BankAccountName],
                        [BankSortCode],
                        [BankAccountNumber],
                        [EmailFooter],
                        [CreatedAt],
                        [UpdatedAt],
                        [CompanyNumber],
                        [DefaultInvoiceNotes],
                        [DefaultJobPriority],
                        [DefaultQuoteNotes],
                        [DefaultReportRange],
                        [DefaultScheduleView],
                        [IncludeArchivedInReports],
                        [IncludeCompletedInReports],
                        [LowStockThreshold],
                        [PurchaseOrderPrefix],
                        [QuoteExpiryDays],
                        [ReplyToEmail]
                    )
                    SELECT
                        tenants.[TenantId],
                        template.[BusinessName],
                        template.[LegalName],
                        template.[LogoUrl],
                        template.[AddressLine1],
                        template.[AddressLine2],
                        template.[Town],
                        template.[County],
                        template.[Postcode],
                        template.[Country],
                        template.[Phone],
                        template.[Email],
                        template.[Website],
                        template.[VatNumber],
                        template.[DefaultVatRate],
                        template.[QuotePrefix],
                        template.[InvoicePrefix],
                        template.[PaymentTerms],
                        template.[BankName],
                        template.[BankAccountName],
                        template.[BankSortCode],
                        template.[BankAccountNumber],
                        template.[EmailFooter],
                        template.[CreatedAt],
                        template.[UpdatedAt],
                        template.[CompanyNumber],
                        template.[DefaultInvoiceNotes],
                        template.[DefaultJobPriority],
                        template.[DefaultQuoteNotes],
                        template.[DefaultReportRange],
                        template.[DefaultScheduleView],
                        template.[IncludeArchivedInReports],
                        template.[IncludeCompletedInReports],
                        template.[LowStockThreshold],
                        template.[PurchaseOrderPrefix],
                        template.[QuoteExpiryDays],
                        template.[ReplyToEmail]
                    FROM
                    (
                        SELECT DISTINCT
                            CASE
                                WHEN [TenantId] = 0 THEN [Id]
                                ELSE [TenantId]
                            END AS [TenantId]
                        FROM [Users]
                        WHERE [SubscriptionPlan] <> N'Internal'
                    ) AS tenants
                    CROSS JOIN
                    (
                        SELECT TOP (1) *
                        FROM [BusinessSettings]
                        WHERE [TenantId] = 0
                        ORDER BY [Id]
                    ) AS template
                    WHERE NOT EXISTS
                    (
                        SELECT 1
                        FROM [BusinessSettings] existing
                        WHERE existing.[TenantId] = tenants.[TenantId]
                    );

                    DELETE FROM [BusinessSettings] WHERE [TenantId] = 0;
                END
                """);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessSettings_TenantId",
                table: "BusinessSettings",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BusinessSettings_TenantId",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "CompanyNumber",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "DefaultInvoiceNotes",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "DefaultJobPriority",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "DefaultQuoteNotes",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "DefaultReportRange",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "DefaultScheduleView",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "IncludeArchivedInReports",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "IncludeCompletedInReports",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "LowStockThreshold",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "PurchaseOrderPrefix",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "QuoteExpiryDays",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "ReplyToEmail",
                table: "BusinessSettings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "BusinessSettings");
        }
    }
}
