using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class CanonicaliseLegacyCustomerRolesAndPasswordReset : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetRequestedAtUtc",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetTokenExpiresAtUtc",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PasswordResetTokenHash",
                table: "Users",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_PasswordResetTokenHash",
                table: "Users",
                column: "PasswordResetTokenHash");

            migrationBuilder.Sql("""
                UPDATE [Users]
                SET [Role] = N'CustomerDirector'
                WHERE [Role] = N'Customer'
                  AND [TenantId] = [Id];
                """);

            migrationBuilder.Sql("""
                UPDATE [Users]
                SET [Role] = N'CustomerEmployee'
                WHERE [Role] = N'Customer'
                  AND [TenantId] <> [Id];
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_PasswordResetTokenHash",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordResetRequestedAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordResetTokenExpiresAtUtc",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordResetTokenHash",
                table: "Users");
        }
    }
}
