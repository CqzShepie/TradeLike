using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeLike.Api.Migrations;

[Migration("20260630110000_AddStaffSettings")]
public partial class AddStaffSettings : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "StaffCategories",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                NormalizedName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StaffCategories", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "StaffRolePresets",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                NormalizedName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                CategoryId = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StaffRolePresets", x => x.Id);
                table.ForeignKey(
                    name: "FK_StaffRolePresets_StaffCategories_CategoryId",
                    column: x => x.CategoryId,
                    principalTable: "StaffCategories",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "StaffRolePresetPermissions",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                RolePresetId = table.Column<int>(type: "int", nullable: false),
                PermissionName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StaffRolePresetPermissions", x => x.Id);
                table.ForeignKey(
                    name: "FK_StaffRolePresetPermissions_StaffRolePresets_RolePresetId",
                    column: x => x.RolePresetId,
                    principalTable: "StaffRolePresets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_StaffCategories_NormalizedName",
            table: "StaffCategories",
            column: "NormalizedName",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_StaffRolePresets_CategoryId",
            table: "StaffRolePresets",
            column: "CategoryId");

        migrationBuilder.CreateIndex(
            name: "IX_StaffRolePresets_NormalizedName",
            table: "StaffRolePresets",
            column: "NormalizedName",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_StaffRolePresetPermissions_RolePresetId_PermissionName",
            table: "StaffRolePresetPermissions",
            columns: new[] { "RolePresetId", "PermissionName" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "StaffRolePresetPermissions");
        migrationBuilder.DropTable(name: "StaffRolePresets");
        migrationBuilder.DropTable(name: "StaffCategories");
    }
}
