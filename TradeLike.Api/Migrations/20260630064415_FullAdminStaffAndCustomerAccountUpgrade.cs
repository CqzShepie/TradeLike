using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations
{
    /// <inheritdoc />
    public partial class FullAdminStaffAndCustomerAccountUpgrade : Migration
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
                defaultValue: "Customer",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldDefaultValue: "Customer");

            migrationBuilder.AddColumn<string>(
                name: "AccountSource",
                table: "Users",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdminTags",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingStatus",
                table: "Users",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Trial");

            migrationBuilder.AddColumn<string>(
                name: "BusinessName",
                table: "Users",
                type: "nvarchar(180)",
                maxLength: 180,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CanCancelCustomers",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanCancelStaff",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanCreateCustomers",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanCreateStaff",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanDeleteData",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanEditCustomerNotes",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanEditCustomers",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanEditStaffPermissions",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanExportData",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanImpersonateCustomer",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanManageDiscounts",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanManageFreeMonths",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanManageSubscriptions",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanResetPasswords",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanSendEmails",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanVerifyEmails",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewBilling",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewCustomerNotes",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewSecurityLogs",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewStaff",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FreeMonthsExpireAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HealthStatus",
                table: "Users",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Green");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLoginAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingEmailSentAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerName",
                table: "Users",
                type: "nvarchar(180)",
                maxLength: 180,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerPhone",
                table: "Users",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalAssistantTo",
                table: "Users",
                type: "nvarchar(220)",
                maxLength: 220,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubscriptionPlan",
                table: "Users",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Trial");

            migrationBuilder.AddColumn<string>(
                name: "SupportNotes",
                table: "Users",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TrialEndsAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ActorRole",
                table: "AdminAuditLogs",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);

            migrationBuilder.CreateIndex(
                name: "IX_Users_AccountStatus",
                table: "Users",
                column: "AccountStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Users_BillingStatus",
                table: "Users",
                column: "BillingStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Role",
                table: "Users",
                column: "Role");

            migrationBuilder.CreateIndex(
                name: "IX_AdminAuditLogs_ActorEmail",
                table: "AdminAuditLogs",
                column: "ActorEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AdminAuditLogs_TargetEmail",
                table: "AdminAuditLogs",
                column: "TargetEmail");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_AccountStatus",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_BillingStatus",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_Role",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_AdminAuditLogs_ActorEmail",
                table: "AdminAuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AdminAuditLogs_TargetEmail",
                table: "AdminAuditLogs");

            migrationBuilder.DropColumn(
                name: "AccountSource",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AdminTags",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BillingStatus",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BusinessName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanCancelCustomers",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanCancelStaff",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanCreateCustomers",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanCreateStaff",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanDeleteData",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanEditCustomerNotes",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanEditCustomers",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanEditStaffPermissions",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanExportData",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanImpersonateCustomer",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanManageDiscounts",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanManageFreeMonths",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanManageSubscriptions",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanResetPasswords",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanSendEmails",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanVerifyEmails",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanViewBilling",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanViewCustomerNotes",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanViewSecurityLogs",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CanViewStaff",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CancelReason",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FreeMonthsExpireAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "HealthStatus",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLoginAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OnboardingEmailSentAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OwnerName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OwnerPhone",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PersonalAssistantTo",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SubscriptionPlan",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SupportNotes",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TrialEndsAt",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Customer",
                oldClrType: typeof(string),
                oldType: "nvarchar(40)",
                oldMaxLength: 40,
                oldDefaultValue: "Customer");

            migrationBuilder.AlterColumn<string>(
                name: "ActorRole",
                table: "AdminAuditLogs",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(40)",
                oldMaxLength: 40);
        }
    }
}
